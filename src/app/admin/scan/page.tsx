import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { checkInAttendee } from "../attendees/check-in-actions";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;

  if (!id) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-16 w-16 text-amber-500" />
        <h1 className="text-2xl font-bold tracking-tight">Invalid Scan</h1>
        <p className="text-muted-foreground">No registration ID was provided in the URL.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/attendees">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const supabase = createClient();
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("*, events(title, date)")
    .eq("id", id)
    .single();

  if (error || !registration) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold tracking-tight">Ticket Not Found</h1>
        <p className="text-muted-foreground">
          This QR code is invalid or the registration was deleted.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/attendees">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Handle the actual check-in process if they are confirmed but not checked in yet
  let checkInResult = null;
  if (registration.status === 'confirmed' && !registration.checked_in) {
      checkInResult = await checkInAttendee(registration.id, true);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 pt-8 px-4">
      <Link href="/admin/attendees" className="text-sm text-foreground flex items-center gap-2 hover:underline">
         <ArrowLeft className="h-4 w-4" /> Back to Attendees
      </Link>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden text-center p-8 space-y-6">
        
        {registration.status !== "confirmed" ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
               <AlertCircle className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Not Approved</h1>
              <p className="text-zinc-500 mt-2">
                This ticket is currently marked as <strong className="text-amber-600 capitalize">{registration.status}</strong>.
              </p>
            </div>
          </>
        ) : registration.checked_in && !checkInResult?.success ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
               <AlertCircle className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Already Checked In</h1>
              <p className="text-zinc-500 mt-2">
                This ticket has already been scanned and verified.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
               <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Valid Ticket</h1>
              <p className="text-emerald-600 font-medium mt-2">
                Check-in successful!
              </p>
            </div>
          </>
        )}

        <div className="border-t border-zinc-100 pt-6 space-y-4 text-left">
          <div>
            <div className="text-sm font-medium text-zinc-500">Attendee Name</div>
            <div className="text-lg font-semibold text-zinc-900">{registration.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-500">Event</div>
            <div className="text-lg font-semibold text-zinc-900">{registration.events?.title}</div>
            <div className="text-sm text-zinc-500">{format(new Date(registration.events?.date), "MMM d, yyyy")}</div>
          </div>
          {registration.phone && (
             <div>
                <div className="text-sm font-medium text-zinc-500">Phone</div>
                <div className="text-md text-zinc-900">{registration.phone}</div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
