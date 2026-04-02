import { redirect } from "next/navigation";

export default function ManageEventPage({ params }: { params: { slug: string } }) {
    redirect(`/events/${params.slug}/manage/overview`);
}
