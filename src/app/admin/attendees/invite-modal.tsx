"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendInvite } from "./invite-actions";
import { toast } from "sonner";

export function InviteUserModal({ events }: { events: { id: string; title: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If there are no events to invite someone to, don't show the button
  if (!events || events.length === 0) return null;

  async function handleInvite(formData: FormData) {
    setIsLoading(true);
    const eventId = formData.get("event_id") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    const result = await sendInvite(eventId, email, name);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invitation sent successfully!");
      setIsOpen(false);
    }

    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite Guest</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite a Guest</DialogTitle>
          <DialogDescription>
            Instantly register someone for an event and send them a confirmation ticket with their QR code.
          </DialogDescription>
        </DialogHeader>
        <form action={handleInvite} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="event_id">Event</Label>
            <select
              name="event_id"
              id="event_id"
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled selected>
                Select an event...
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" placeholder="John Doe" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="john@example.com" required />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  "Send Invitation"
                )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
