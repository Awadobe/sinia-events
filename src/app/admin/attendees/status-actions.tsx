"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateRegistrationStatus } from "./actions";
import { toast } from "sonner";

export function StatusActions({
  registrationId,
  currentStatus,
}: {
  registrationId: string;
  currentStatus: string;
}) {
  const [isLoading, setIsLoading] = useState<"confirmed" | "denied" | null>(null);

  const handleUpdate = async (newStatus: "confirmed" | "denied") => {
    setIsLoading(newStatus);
    const result = await updateRegistrationStatus(registrationId, newStatus);
    
    if (result.error) {
      toast.error(`Failed to update status: ${result.error}`);
    } else {
      toast.success(`Attendee marked as ${newStatus}`);
    }
    setIsLoading(null);
  };

  if (currentStatus !== "pending") {
    // If they are already confirmed/denied, we might just show a minimal disabled state 
    // or standard button to reverse it. For now, we only allow confirming pending ones.
    return (
      <span className="text-xs text-zinc-400 select-none px-2">Processed</span>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        onClick={() => handleUpdate("confirmed")}
        disabled={isLoading !== null}
        title="Approve"
      >
        {isLoading === "confirmed" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={() => handleUpdate("denied")}
        disabled={isLoading !== null}
        title="Deny"
      >
        {isLoading === "denied" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
