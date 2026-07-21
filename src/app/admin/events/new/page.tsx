import { redirect } from "next/navigation";

export default function AdminNewEventPage() {
    redirect("/events/new");
}
