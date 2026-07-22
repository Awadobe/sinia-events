import { NextResponse } from "next/server";
import { requireEventManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: { slug: string } }
) {
    const access = await requireEventManager(params.slug);

    return NextResponse.json({
        authenticated: Boolean(access.user),
        can_manage: access.authorized,
        is_admin: access.isAdmin,
        is_owner: access.isOwner,
        collaborator_role: access.collaboratorRole,
        is_check_in_staff: access.isCheckInStaff,
    });
}
