"use client";

import { useState } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";

export function OrganizationControls({ hostId, initialStatus }: { hostId: string; initialStatus: "active" | "suspended" }) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    async function changeStatus() {
        const nextStatus = status === "active" ? "suspended" : "active";
        if (nextStatus === "suspended" && !window.confirm("Suspend this organization? It will disappear from public organization and event discovery until restored.")) return;
        setLoading(true);
        const response = await fetch(`/api/platform-admin/hosts/${hostId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
        const result = await response.json();
        setLoading(false);
        if (!response.ok) return toast.error(result.error || "Could not update organization");
        setStatus(nextStatus);
        toast.success(nextStatus === "active" ? "Organization restored" : "Organization suspended");
    }

    return <button onClick={changeStatus} disabled={loading} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${status === "active" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}{status === "active" ? "Suspend" : "Restore"}</button>;
}
