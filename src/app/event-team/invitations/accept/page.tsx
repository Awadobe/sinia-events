import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export const dynamic = "force-dynamic";

export default async function AcceptEventTeamInvitation({ searchParams }: { searchParams: { token?: string } }) {
    const token = searchParams.token;
    if (!token) return <InvitationMessage title="Invalid invitation" message="This event-team invitation link is incomplete." />;

    const { data: collaborator } = await admin
        .from("event_collaborators")
        .select("id, email, role, status, event:events(slug, title)")
        .eq("accept_token", token)
        .maybeSingle();

    if (!collaborator || collaborator.status !== "active") {
        return <InvitationMessage title="Invitation unavailable" message="This invitation is invalid or has been removed." />;
    }

    const event = Array.isArray(collaborator.event) ? collaborator.event[0] : collaborator.event;
    if (!event) return <InvitationMessage title="Event unavailable" message="The event connected to this invitation could not be found." />;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nextPath = `/event-team/invitations/accept?token=${token}`;
    if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

    if (!user.email || user.email.toLowerCase() !== collaborator.email.toLowerCase()) {
        return <InvitationMessage title="Use the invited email" message={`This role was assigned to ${collaborator.email}. Sign out and open the invitation using that email address.`} />;
    }

    await admin.from("event_collaborators").update({ user_id: user.id }).eq("id", collaborator.id);
    redirect(`/admin/events/${event.slug}/manage/${collaborator.role === "check_in" ? "checkin" : "overview"}`);
}

function InvitationMessage({ title, message }: { title: string; message: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-5">
            <div className="max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">{message}</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/login" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white">Sign in</Link>
                    <form action="/auth/signout" method="post"><button className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600">Sign out</button></form>
                </div>
            </div>
        </div>
    );
}
