import Link from "next/link";
import { Building2, Check, Clock3 } from "lucide-react";

export default function VenueSubmittedPage({ searchParams }: { searchParams?: { name?: string } }) {
  const venueName = searchParams?.name || "Your venue";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f3ed] px-5 py-16">
      <main className="w-full max-w-xl rounded-[2rem] border border-black/5 bg-white p-7 text-center shadow-[0_24px_70px_rgba(60,40,20,0.1)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Check className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Submission received</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{venueName} is ready for review.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
          Radius will check the venue information and authorized contact before publishing it in the catalogue.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-left">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <div><p className="text-sm font-semibold text-zinc-800">Current status: Pending review</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">The listing is not public yet. You can continue using Radius while the review is completed.</p></div>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/venues" className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white">Browse venues</Link>
          <Link href="/organizer" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700"><Building2 className="h-4 w-4" /> Organizer account</Link>
        </div>
      </main>
    </div>
  );
}

