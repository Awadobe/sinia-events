import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendVenueEnquiryCreatedEmails, sendVenueEnquiryResponseEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const responseStatuses = ["available", "confirmed", "rejected", "proposed_alternative", "contacted", "inspection_scheduled", "closed"];
const timeSlots = ["morning", "afternoon", "evening", "full_day"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { venueId: string; enquiryId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to respond." }, { status: 401 });
  const { data: allowed } = await supabase.rpc("can_manage_venue", { target_venue_id: params.venueId });
  if (!allowed) return NextResponse.json({ error: "You cannot manage this venue." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "");
  const responseMessage = String(body.responseMessage || "").trim().slice(0, 1500) || null;
  const alternativeDate = body.alternativeDate ? String(body.alternativeDate) : null;
  const alternativeTimeSlot = body.alternativeTimeSlot ? String(body.alternativeTimeSlot) : null;
  if (!responseStatuses.includes(status)) {
    return NextResponse.json({ error: "Choose a valid response." }, { status: 400 });
  }
  if (status === "proposed_alternative" && (!alternativeDate || !/^\d{4}-\d{2}-\d{2}$/.test(alternativeDate) || !timeSlots.includes(alternativeTimeSlot || ""))) {
    return NextResponse.json({ error: "Choose the alternative date and time." }, { status: 400 });
  }

  const { data: enquiry } = await admin
    .from("venue_enquiries")
    .select("id, venue_id, event_date, time_slot, space_id, requester_name, requester_email")
    .eq("id", params.enquiryId)
    .eq("venue_id", params.venueId)
    .maybeSingle();
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

  const { data: updated, error } = await admin
    .from("venue_enquiries")
    .update({
      status,
      response_message: responseMessage,
      alternative_date: status === "proposed_alternative" ? alternativeDate : null,
      alternative_time_slot: status === "proposed_alternative" ? alternativeTimeSlot : null,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", enquiry.id)
    .select("id, status")
    .single();
  if (error || !updated) return NextResponse.json({ error: "The response could not be saved." }, { status: 500 });

  if (status === "confirmed" || status === "available") {
    const calendarStatus = status === "confirmed" ? "booked" : "available";
    const existingQuery = admin
      .from("venue_availability")
      .select("id")
      .eq("venue_id", params.venueId)
      .eq("date", enquiry.event_date)
      .eq("time_slot", enquiry.time_slot);
    const { data: existing } = enquiry.space_id
      ? await existingQuery.eq("space_id", enquiry.space_id).maybeSingle()
      : await existingQuery.is("space_id", null).maybeSingle();
    const values = {
      venue_id: params.venueId,
      space_id: enquiry.space_id,
      date: enquiry.event_date,
      time_slot: enquiry.time_slot,
      status: calendarStatus,
      source: "enquiry",
      enquiry_id: enquiry.id,
      verified_at: status === "available" ? new Date().toISOString() : null,
      created_by: user.id,
    };
    const calendarResult = existing
      ? await admin.from("venue_availability").update(values).eq("id", existing.id)
      : await admin.from("venue_availability").insert(values);
    if (calendarResult.error) {
      console.error("Confirmed enquiry calendar update failed:", calendarResult.error);
      return NextResponse.json({ error: "The response saved, but the calendar could not be updated." }, { status: 500 });
    }
  }

  let emailDelivered = false;
  if (enquiry.requester_email) {
    const { data: venue } = await admin.from("venues").select("name").eq("id", params.venueId).maybeSingle();
    if (venue) {
      const emailResult = await sendVenueEnquiryResponseEmail({
        toEmail: enquiry.requester_email,
        venueName: venue.name,
        requesterName: enquiry.requester_name,
        eventDate: enquiry.event_date,
        timeSlot: enquiry.time_slot,
        status,
        responseMessage,
        alternativeDate,
        alternativeTimeSlot,
        reference: `VEN-${enquiry.id.slice(0, 8).toUpperCase()}`,
      });
      emailDelivered = emailResult.success;
      if (emailDelivered) {
        await admin.from("venue_enquiries").update({ requester_notified_at: new Date().toISOString() }).eq("id", enquiry.id);
      }
    }
  }

  return NextResponse.json({ enquiry: updated, emailDelivered });
}

export async function POST(
  _: NextRequest,
  { params }: { params: { venueId: string; enquiryId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to resend this email." }, { status: 401 });
  const { data: allowed } = await supabase.rpc("can_manage_venue", { target_venue_id: params.venueId });
  if (!allowed) return NextResponse.json({ error: "You cannot manage this venue." }, { status: 403 });

  const [{ data: enquiry }, { data: venue }, { data: members }] = await Promise.all([
    admin
      .from("venue_enquiries")
      .select("id, requester_name, requester_email, requester_phone, event_type, event_date, time_slot, guest_count, status, response_message, alternative_date, alternative_time_slot")
      .eq("id", params.enquiryId)
      .eq("venue_id", params.venueId)
      .maybeSingle(),
    admin.from("venues").select("name, slug, contact_email").eq("id", params.venueId).maybeSingle(),
    admin.from("venue_members").select("email").eq("venue_id", params.venueId).eq("status", "active"),
  ]);
  if (!enquiry || !venue) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  if (!enquiry.requester_email) return NextResponse.json({ error: "This requester did not provide an email address." }, { status: 400 });

  const reference = `VEN-${enquiry.id.slice(0, 8).toUpperCase()}`;
  let emailDelivered = false;
  if (enquiry.status === "submitted") {
    const result = await sendVenueEnquiryCreatedEmails({
      venueEmails: [venue.contact_email, ...(members || []).map((member) => member.email)].filter((email): email is string => Boolean(email)),
      details: {
        venueName: venue.name,
        venueSlug: venue.slug,
        requesterName: enquiry.requester_name,
        requesterEmail: enquiry.requester_email,
        requesterPhone: enquiry.requester_phone,
        eventType: enquiry.event_type,
        eventDate: enquiry.event_date,
        timeSlot: enquiry.time_slot,
        guestCount: enquiry.guest_count,
        reference,
      },
    });
    emailDelivered = result.requesterDelivered;
  } else {
    const result = await sendVenueEnquiryResponseEmail({
      toEmail: enquiry.requester_email,
      venueName: venue.name,
      requesterName: enquiry.requester_name,
      eventDate: enquiry.event_date,
      timeSlot: enquiry.time_slot,
      status: enquiry.status,
      responseMessage: enquiry.response_message,
      alternativeDate: enquiry.alternative_date,
      alternativeTimeSlot: enquiry.alternative_time_slot,
      reference,
    });
    emailDelivered = result.success;
  }
  if (emailDelivered) {
    await admin.from("venue_enquiries").update({ requester_notified_at: new Date().toISOString() }).eq("id", enquiry.id);
  }
  return NextResponse.json({ emailDelivered }, { status: emailDelivered ? 200 : 502 });
}
