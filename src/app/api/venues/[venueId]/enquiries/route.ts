import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendVenueEnquiryCreatedEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

const validTimeSlots = ["morning", "afternoon", "evening", "full_day"];
const validContacts = ["whatsapp", "phone", "email"];

function clean(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request: NextRequest, { params }: { params: { venueId: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The enquiry information is invalid." }, { status: 400 });
  }

  if (clean(body.website)) return NextResponse.json({ reference: "Received" });

  const eventDate = clean(body.eventDate, 10);
  const timeSlot = clean(body.timeSlot, 20);
  const eventType = clean(body.eventType, 100);
  const requesterName = clean(body.requesterName, 120);
  const requesterPhone = clean(body.requesterPhone, 40);
  const requesterEmail = clean(body.requesterEmail, 254).toLowerCase();
  const preferredContact = clean(body.preferredContact, 20);
  const message = clean(body.message, 1500);
  const guestCount = Number(body.guestCount);
  const spaceId = clean(body.spaceId, 50) || null;
  const packageId = clean(body.packageId, 50) || null;
  const addonIds = Array.isArray(body.addonIds)
    ? Array.from(new Set(body.addonIds.map((item) => clean(item, 50)).filter(Boolean)))
    : [];

  const parsedDate = new Date(`${eventDate}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (
    !eventDate ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate < today ||
    !validTimeSlots.includes(timeSlot) ||
    !eventType ||
    !requesterName ||
    !requesterPhone ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 100000 ||
    !validContacts.includes(preferredContact)
  ) {
    return NextResponse.json({ error: "Complete the date, event, guest, and contact details." }, { status: 400 });
  }
  if (requesterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (preferredContact === "email" && !requesterEmail) {
    return NextResponse.json({ error: "Add an email address when email is your preferred contact." }, { status: 400 });
  }

  const { data: venue } = await admin
    .from("venues")
    .select("id, name, slug, maximum_capacity, contact_email")
    .eq("id", params.venueId)
    .eq("status", "published")
    .maybeSingle();
  if (!venue) return NextResponse.json({ error: "This venue is not accepting public enquiries." }, { status: 404 });
  if (venue.maximum_capacity && guestCount > venue.maximum_capacity) {
    return NextResponse.json({ error: `This venue accepts up to ${venue.maximum_capacity} guests.` }, { status: 400 });
  }

  if (spaceId) {
    const { data: space } = await admin.from("venue_spaces").select("id").eq("id", spaceId).eq("venue_id", venue.id).eq("is_active", true).maybeSingle();
    if (!space) return NextResponse.json({ error: "Choose a valid venue space." }, { status: 400 });
  }

  const { data: availability } = await admin
    .from("venue_availability")
    .select("status, time_slot")
    .eq("venue_id", venue.id)
    .eq("date", eventDate)
    .in("time_slot", timeSlot === "full_day" ? ["full_day", "morning", "afternoon", "evening"] : ["full_day", timeSlot]);
  if ((availability || []).some((item) => ["held", "booked", "blocked"].includes(item.status))) {
    return NextResponse.json({ error: "That date or time is no longer available. Choose another option." }, { status: 409 });
  }

  let selectedPackage: { id: string; price: number | null } | null = null;
  if (packageId) {
    const { data } = await admin.from("venue_packages").select("id, price").eq("id", packageId).eq("venue_id", venue.id).eq("is_active", true).maybeSingle();
    if (!data) return NextResponse.json({ error: "Choose a valid venue package." }, { status: 400 });
    selectedPackage = data;
  }

  let selectedAddons: Array<{ id: string; price: number | null }> = [];
  if (addonIds.length) {
    const { data } = await admin.from("venue_addons").select("id, price").eq("venue_id", venue.id).eq("is_active", true).in("id", addonIds);
    selectedAddons = data || [];
    if (selectedAddons.length !== addonIds.length) {
      return NextResponse.json({ error: "One of the selected extras is unavailable." }, { status: 400 });
    }
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const estimatedTotal =
    Number(selectedPackage?.price || 0) +
    selectedAddons.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const { data: enquiry, error } = await admin
    .from("venue_enquiries")
    .insert({
      venue_id: venue.id,
      space_id: spaceId,
      package_id: packageId,
      requester_user_id: user?.id || null,
      requester_name: requesterName,
      requester_email: requesterEmail || null,
      requester_phone: requesterPhone,
      preferred_contact: preferredContact,
      event_type: eventType,
      event_date: eventDate,
      time_slot: timeSlot,
      guest_count: guestCount,
      message: message || null,
      estimated_total: estimatedTotal || null,
      status: "submitted",
    })
    .select("id")
    .single();
  if (error || !enquiry) {
    console.error("Venue enquiry insert failed:", error);
    return NextResponse.json({ error: "The enquiry could not be saved. Please try again." }, { status: 500 });
  }

  if (selectedAddons.length) {
    const { error: addonError } = await admin.from("venue_enquiry_addons").insert(
      selectedAddons.map((item) => ({
        enquiry_id: enquiry.id,
        addon_id: item.id,
        unit_price: item.price,
      }))
    );
    if (addonError) {
      await admin.from("venue_enquiries").delete().eq("id", enquiry.id);
      console.error("Venue enquiry addons insert failed:", addonError);
      return NextResponse.json({ error: "The selected extras could not be saved." }, { status: 500 });
    }
  }

  const reference = `VEN-${enquiry.id.slice(0, 8).toUpperCase()}`;
  const { data: venueMembers } = await admin
    .from("venue_members")
    .select("email")
    .eq("venue_id", venue.id)
    .eq("status", "active");
  const venueEmails = [venue.contact_email, ...(venueMembers || []).map((member) => member.email)]
    .filter((email): email is string => Boolean(email));
  const emailResult = await sendVenueEnquiryCreatedEmails({
    venueEmails,
    details: {
      venueName: venue.name,
      venueSlug: venue.slug,
      requesterName,
      requesterEmail: requesterEmail || null,
      requesterPhone,
      eventType,
      eventDate,
      timeSlot,
      guestCount,
      reference,
    },
  });
  await admin
    .from("venue_enquiries")
    .update({
      venue_notified_at: emailResult.venueDelivered ? new Date().toISOString() : null,
      requester_notified_at: emailResult.requesterDelivered ? new Date().toISOString() : null,
    })
    .eq("id", enquiry.id);

  return NextResponse.json({
    reference,
    requesterEmailDelivered: emailResult.requesterDelivered,
  }, { status: 201 });
}
