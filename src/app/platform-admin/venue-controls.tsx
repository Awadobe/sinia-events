"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PauseCircle, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

type VenueStatus = "draft" | "pending_review" | "published" | "suspended" | "rejected";

export function VenueControls({ venueId, initialStatus }: { venueId: string; initialStatus: VenueStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<VenueStatus | null>(null);

  async function changeStatus(nextStatus: VenueStatus) {
    if (nextStatus === "rejected" && !window.confirm("Reject this venue submission? The owner can submit corrected information later.")) return;
    if (nextStatus === "suspended" && !window.confirm("Suspend this venue? It will disappear from public discovery.")) return;
    setLoading(nextStatus);
    const response = await fetch(`/api/platform-admin/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    setLoading(null);
    if (!response.ok) return toast.error(result.error || "Could not update the venue.");
    setStatus(nextStatus);
    toast.success(nextStatus === "published" ? "Venue published." : `Venue changed to ${nextStatus.replaceAll("_", " ")}.`);
  }

  const button = (nextStatus: VenueStatus, label: string, Icon: typeof CheckCircle2, style: string) => (
    <button
      type="button"
      disabled={Boolean(loading)}
      onClick={() => changeStatus(nextStatus)}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${style}`}
    >
      {loading === nextStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );

  if (status === "published") return button("suspended", "Suspend", PauseCircle, "bg-red-50 text-red-600");
  if (status === "suspended" || status === "rejected") return button("pending_review", "Return to review", RotateCcw, "bg-orange-50 text-orange-700");
  return <>{button("rejected", "Reject", XCircle, "bg-red-50 text-red-600")}{button("published", "Approve and publish", CheckCircle2, "bg-emerald-600 text-white")}</>;
}

