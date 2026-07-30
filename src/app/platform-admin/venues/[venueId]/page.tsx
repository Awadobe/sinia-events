import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft, Building2, Check, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { VenueControls } from "../../venue-controls";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

function textLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function youtubeEmbedUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    let id = "";
    if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") || "" : url.pathname.split("/")[2] || "";
    }
    return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default async function VenueReviewPage({ params }: { params: { venueId: string } }) {
  const access = await requireAdmin();
  if (!access.user) redirect(`/login?next=/platform-admin/venues/${params.venueId}`);
  if (!access.authorized) redirect("/");

  const { data: venue } = await admin
    .from("venues")
    .select("*, host:hosts(name, type)")
    .eq("id", params.venueId)
    .maybeSingle();
  if (!venue) notFound();

  const [{ data: media }, { data: spaces }, { data: packages }] = await Promise.all([
    admin.from("venue_media").select("id, url, alt_text, is_cover, display_order").eq("venue_id", venue.id).order("is_cover", { ascending: false }).order("display_order"),
    admin.from("venue_spaces").select("*").eq("venue_id", venue.id).order("created_at"),
    admin.from("venue_packages").select("*").eq("venue_id", venue.id).order("created_at"),
  ]);
  const spaceIds = (spaces || []).map((space) => space.id);
  const { data: spaceAmenities } = spaceIds.length
    ? await admin
        .from("venue_space_amenities")
        .select("space_id, amenity:venue_amenities(name, category)")
        .in("space_id", spaceIds)
    : { data: [] };
  const host = Array.isArray(venue.host) ? venue.host[0] : venue.host;
  const video = youtubeEmbedUrl(venue.video_url);

  return (
    <div className="venuefind-page min-h-screen bg-[#faf6f2]">
      <header className="border-b border-[#ebe5de] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 sm:px-10">
          <Link href="/platform-admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6b64] hover:text-[#ff5e36]">
            <ArrowLeft className="h-4 w-4" /> Venue submissions
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5f6b64]">
            <ShieldCheck className="h-4 w-4 text-[#ff5e36]" /> Platform review
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-10 sm:py-14">
        <div className="flex flex-col gap-6 border-b border-[#ebe5de] pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5e36]">Venue application</p>
            <h1 className="venuefind-display mt-3 text-5xl tracking-[-0.04em] text-[#18231d] sm:text-6xl">{venue.name}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5f6b64]">
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {host?.name || "Independent venue"}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {venue.area}, {venue.city}</span>
              <span>{textLabel(venue.venue_type)}</span>
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-800">{textLabel(venue.status)}</span>
        </div>

        <section className="py-10">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#ff5e36]">Submitted photographs</p><h2 className="venuefind-display mt-2 text-3xl text-[#18231d]">Venue gallery</h2></div>
            <span className="text-xs text-[#7b857f]">{media?.length || 0} photograph{media?.length === 1 ? "" : "s"}</span>
          </div>
          {media?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-[15px] border border-[#ebe5de] bg-white">
                  <div className="relative aspect-[4/3]"><Image src={item.url} alt={item.alt_text || venue.name} fill unoptimized className="object-cover" /></div>
                  <figcaption className="flex items-center justify-between px-4 py-3 text-xs text-[#5f6b64]"><span>{item.is_cover ? "Cover photograph" : "Gallery photograph"}</span>{item.is_cover && <strong className="text-[#ff5e36]">Primary</strong>}</figcaption>
                </figure>
              ))}
            </div>
          ) : <div className="mt-6 rounded-[15px] border border-dashed border-[#ead8bd] bg-white p-8 text-center text-sm text-[#7b857f]">No photographs were submitted.</div>}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <ReviewSection title="Venue information">
              <p className="text-lg leading-8 text-[#46534c]">{venue.description || venue.short_description || "No description supplied."}</p>
              {venue.short_description && <p className="mt-4 rounded-xl bg-[#f7f1e9] p-4 text-sm text-[#5f6b64]"><strong>Catalogue introduction:</strong> {venue.short_description}</p>}
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail label="Full address" value={[venue.address, venue.area, venue.city].filter(Boolean).join(", ")} />
                <Detail label="Maximum capacity" value={venue.maximum_capacity ? `${venue.maximum_capacity} guests` : "Not supplied"} />
                <Detail label="Starting price" value={venue.starting_price === null ? "On request" : `SLE ${Number(venue.starting_price).toLocaleString()} · ${textLabel(venue.price_basis || "on_request")}`} />
                <Detail label="Accepted events" value={(venue.event_types || []).join(", ") || "Not supplied"} />
              </dl>
            </ReviewSection>

            {spaces?.map((space) => {
              const amenities = (spaceAmenities || [])
                .filter((item) => item.space_id === space.id)
                .map((item) => {
                  const amenity = item.amenity as unknown as { name: string } | Array<{ name: string }> | null;
                  return Array.isArray(amenity) ? amenity[0]?.name : amenity?.name;
                })
                .filter(Boolean);
              return (
                <ReviewSection key={space.id} title={space.name}>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#ff5e36]">{textLabel(space.space_type)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Detail label="Theatre" value={space.theatre_capacity ?? "—"} />
                    <Detail label="Classroom" value={space.classroom_capacity ?? "—"} />
                    <Detail label="Banquet" value={space.banquet_capacity ?? "—"} />
                    <Detail label="Standing" value={space.standing_capacity ?? "—"} />
                  </div>
                  {amenities.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{amenities.map((item) => <span key={item} className="rounded-full bg-[#fff1d3] px-3 py-1.5 text-xs font-semibold text-[#76521a]">{item}</span>)}</div>}
                </ReviewSection>
              );
            })}

            {video && (
              <ReviewSection title="Submitted venue video">
                <div className="aspect-video overflow-hidden rounded-[15px] bg-black"><iframe src={video} title={`${venue.name} venue tour`} className="h-full w-full" allowFullScreen /></div>
              </ReviewSection>
            )}

            <ReviewSection title="Rules, inclusions and charges">
              <List title="Rules and restrictions" items={venue.rules || []} />
              <List title="Possible additional charges" items={venue.additional_charges || []} />
              {packages?.map((item) => <div key={item.id} className="mt-5 rounded-xl bg-[#f7f1e9] p-4"><strong>{item.name}</strong><p className="mt-1 text-sm text-[#5f6b64]">{item.description}</p>{item.included_items?.length > 0 && <p className="mt-2 text-xs text-[#5f6b64]">Includes: {item.included_items.join(", ")}</p>}</div>)}
            </ReviewSection>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-[18px] border border-[#ebe5de] bg-white p-6 shadow-[0_16px_40px_rgba(80,54,39,0.08)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff5e36]">Authorized contact</p>
              <h2 className="venuefind-display mt-2 text-3xl text-[#18231d]">{venue.contact_name || "Not supplied"}</h2>
              <div className="mt-5 space-y-3 text-sm text-[#5f6b64]">
                <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-[#ff5e36]" /> {venue.contact_phone || "No phone supplied"}</p>
                <p className="flex gap-2 break-all"><Mail className="h-4 w-4 shrink-0 text-[#ff5e36]" /> {venue.contact_email || "No email supplied"}</p>
              </div>
            </section>

            <section className="rounded-[18px] border border-[#ead7a2] bg-[#fff9ec] p-6">
              <h2 className="font-semibold text-[#18231d]">Review decision</h2>
              <p className="mt-2 text-xs leading-6 text-[#74500d]">Confirm the venue details, photographs, contact and claimed facilities before approving.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <VenueControls venueId={venue.id} initialStatus={venue.status} />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[18px] border border-[#ebe5de] bg-white p-6 sm:p-8"><h2 className="venuefind-display text-3xl text-[#18231d]">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-[#faf6f2] p-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-[#7b857f]">{label}</dt><dd className="mt-1 text-sm font-semibold text-[#18231d]">{value}</dd></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="mt-5 first:mt-0"><h3 className="font-semibold text-[#18231d]">{title}</h3>{items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm text-[#5f6b64]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5e36]" />{item}</li>)}</ul> : <p className="mt-2 text-sm text-[#7b857f]">None supplied.</p>}</div>;
}
