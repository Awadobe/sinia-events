import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusActions } from "./status-actions";
import { CheckInToggle } from "./check-in-toggle";
import { InviteUserModal } from "./invite-modal";

export const revalidate = 0;

export default async function AttendeesPage() {
  const supabase = createClient();

  // Fetch all registrations across all events, ordered by newest first
  const { data: registrations, error } = await supabase
    .from("registrations")
    .select(`
      *,
      events (
        title,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch attendees:", error);
  }

  // Fetch active events for the Invite Modal dropdown
  const { data: eventsList } = await supabase
    .from("events")
    .select("id, title")
    .order("date", { ascending: true });


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Attendees
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage all event registrations and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
             <Input
               type="search"
               placeholder="Search attendees..."
               className="w-full bg-white pl-9 sm:w-[300px]"
               disabled // Searching would require client-side state or URL params, which we can add later
             />
           </div>
           <InviteUserModal events={eventsList || []} />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow>
              <TableHead>Attendee</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Date Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!registrations?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No attendees found.
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{reg.name}</div>
                    <div className="text-sm text-muted-foreground">{reg.email}</div>
                    {reg.phone && <div className="text-xs text-muted-foreground/70 mt-0.5">{reg.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate font-medium text-foreground">
                      {reg.events?.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(reg.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        reg.status === "confirmed"
                          ? "default"
                          : reg.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={
                        reg.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none"
                          : reg.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-none"
                          : "shadow-none"
                      }
                    >
                      {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CheckInToggle registrationId={reg.id} isCheckedIn={!!reg.checked_in} />
                  </TableCell>
                  <TableCell className="text-right">
                      <StatusActions registrationId={reg.id} currentStatus={reg.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
