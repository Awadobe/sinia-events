import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export const dynamic = "force-dynamic";

export default async function AcceptOrganizationInvitation({ searchParams }: { searchParams: { token?: string } }) {
    const token = searchParams.token;
    if (!token) return <InvitationMessage title="Invalid invitation" message="This invitation link is incomplete." />;

    const { data: invitation } = await admin.from("host_invitations").select("id, host_id, email, status, invited_by, host:hosts(name)").eq("accept_token", token).maybeSingle();
    if (!invitation || invitation.status === "revoked") return <InvitationMessage title="Invitation unavailable" message="This invitation is invalid or has been cancelled." />;
    if (invitation.status === "accepted") redirect("/organizer?invitation=already-accepted");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nextPath = `/organizer/invitations/accept?token=${token}`;
    if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

    if (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return <InvitationMessage title="Use the invited email" message={`This invitation was sent to ${invitation.email}. Sign out and open the link using that email address.`} />;
    }

    const { error: membershipError } = await admin.from("host_organizers").upsert({ host_id: invitation.host_id, user_id: user.id, added_by: invitation.invited_by });
    if (membershipError) return <InvitationMessage title="Could not accept invitation" message="Radius could not add this organization. Please ask the organizer to try again." />;
    await admin.from("host_invitations").update({ status: "accepted" }).eq("id", invitation.id);
    redirect("/organizer?invitation=accepted");
}

function InvitationMessage({ title, message }: { title: string; message: string }) {
    return <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-5"><div className="max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold text-zinc-900">{title}</h1><p className="mt-3 text-sm leading-relaxed text-zinc-500">{message}</p><div className="mt-6 flex justify-center gap-3"><Link href="/organizer" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white">Organizer dashboard</Link><form action="/auth/signout" method="post"><button className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600">Sign out</button></form></div></div></div>;
}
