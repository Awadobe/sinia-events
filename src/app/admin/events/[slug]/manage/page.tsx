import { redirect } from "next/navigation";

export default function ManageEventPage({ params }: { params: { slug: string } }) {
    redirect(`/admin/events/${params.slug}/manage/overview`);
}
