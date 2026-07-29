import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VenueSubmissionForm } from "./venue-submission-form";

export const dynamic = "force-dynamic";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export default async function NewVenuePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/venues/new");

  const [{ data: memberships }, { data: amenities }] = await Promise.all([
    admin
      .from("host_organizers")
      .select("host:hosts(id, type, name, slug)")
      .eq("user_id", user.id),
    admin.from("venue_amenities").select("key, name, category").order("category").order("name"),
  ]);

  const hosts = (memberships || [])
    .map((membership) => membership.host)
    .filter(Boolean) as unknown as Array<{
    id: string;
    type: "individual" | "organization";
    name: string;
    slug: string;
  }>;

  return (
    <div className="min-h-screen bg-[#f6f3ed]">
      <header className="border-b border-black/5 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">
              R
            </span>
            Radius
          </Link>
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" /> Venue catalogue
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            Venue partner application
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Help customers understand your space before they visit.
          </h1>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Your submission stays private while Radius reviews the venue, its authorized
            contact, and the information customers will rely on.
          </p>
        </div>
        <VenueSubmissionForm hosts={hosts} amenities={amenities || []} />
      </main>
    </div>
  );
}

