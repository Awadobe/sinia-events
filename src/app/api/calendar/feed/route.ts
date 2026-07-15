import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

function escapeIcalText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcalDate(dateStr: string) {
  return new Date(dateStr)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("org");

  let organizerId: string | null = null;
  let calName = "Radius Events";
  let calDesc = "Tech events on the Radius platform";
  let fileName = "radius-events.ics";

  // If an org slug is provided, filter events by that organizer
  if (orgSlug) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, name, org_name")
      .eq("slug", orgSlug)
      .single();

    if (profile) {
      organizerId = profile.id;
      const displayName = profile.org_name || profile.name || orgSlug;
      calName = `${displayName} Events`;
      calDesc = `Events by ${displayName} on Radius`;
      fileName = `${orgSlug}-events.ics`;
    }
  }

  // Build query
  let query = supabaseAdmin
    .from("events")
    .select(
      "id, title, description, date, end_date, location, is_virtual, slug, event_type"
    )
    .neq("status", "cancelled")
    .order("date", { ascending: true });

  if (organizerId) {
    query = query.eq("organizer_id", organizerId);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  const host = new URL(request.url).host;
  const origin = `https://${host}`;

  const vevents = (events || [])
    .map((event) => {
      const start = toIcalDate(event.date);
      const end = event.end_date
        ? toIcalDate(event.end_date)
        : toIcalDate(
            new Date(
              new Date(event.date).getTime() + 2 * 60 * 60 * 1000
            ).toISOString()
          );

      const lines = [
        "BEGIN:VEVENT",
        `UID:${event.id}@${host}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeIcalText(event.title)}`,
        `URL:${origin}/events/${event.slug}`,
      ];

      if (event.description) {
        lines.push(
          `DESCRIPTION:${escapeIcalText(event.description.substring(0, 500))}`
        );
      }

      if (event.location) {
        lines.push(`LOCATION:${escapeIcalText(event.location)}`);
      } else if (event.is_virtual) {
        lines.push(`LOCATION:Online`);
      }

      if (event.event_type) {
        lines.push(
          `CATEGORIES:${escapeIcalText(event.event_type)}`
        );
      }

      lines.push("END:VEVENT");
      return lines.join("\r\n");
    })
    .join("\r\n");

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Radius//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    `X-WR-CALDESC:${calDesc}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
