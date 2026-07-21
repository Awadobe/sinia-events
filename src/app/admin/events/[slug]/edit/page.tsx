import { redirect } from "next/navigation";

export default function LegacyEditEventPage({ params }: { params: { slug: string } }) {
    redirect(`/admin/events/${params.slug}/manage/edit`);
}
