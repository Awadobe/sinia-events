"use client";

import { useState } from "react";
import { CheckSquare, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkInAttendee } from "./check-in-actions";
import { toast } from "sonner";

export function CheckInToggle({
  registrationId,
  isCheckedIn,
}: {
  registrationId: string;
  isCheckedIn: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(isCheckedIn);

  const handleToggle = async () => {
    setIsLoading(true);
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setCurrentStatus(newStatus);
    
    const result = await checkInAttendee(registrationId, newStatus);
    
    if (result.error) {
      // Revert on failure
      setCurrentStatus(!newStatus);
      toast.error(`Failed to update check-in: ${result.error}`);
    } else {
      toast.success(newStatus ? "Attendee checked in!" : "Check-in removed.");
    }
    setIsLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 px-2 gap-2 ${
        currentStatus 
          ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
          : "text-zinc-500 hover:text-zinc-700"
      }`}
      onClick={handleToggle}
      disabled={isLoading}
      title={currentStatus ? "Mark as not checked in" : "Check in spectator"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : currentStatus ? (
        <CheckSquare className="h-4 w-4" />
      ) : (
        <Square className="h-4 w-4" />
      )}
      <span className="text-xs font-medium">
        {currentStatus ? "Checked In" : "Check In"}
      </span>
    </Button>
  );
}
