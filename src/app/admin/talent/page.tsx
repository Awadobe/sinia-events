import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const revalidate = 0;

export default async function TalentDatabasePage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure it's an admin (has email)
    if (!user || (!user.email && !user.user_metadata?.is_admin)) {
        redirect("/admin/login");
    }

    const query = searchParams.q?.toLowerCase() || "";

    // Fetch all profiles
    let { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    // Filter by query (name, headline, bio, or skills array)
    if (profiles && query) {
        profiles = profiles.filter(p => {
            const inName = p.name?.toLowerCase().includes(query);
            const inHeadline = p.headline?.toLowerCase().includes(query);
            const inBio = p.bio?.toLowerCase().includes(query);
            const inSkills = p.skills?.some((s: string) => s.toLowerCase().includes(query));
            
            return inName || inHeadline || inBio || inSkills;
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Talent Database</h1>
                <p className="text-muted-foreground">
                    Search and filter community members by skills, headline, or name.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <form className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        name="q"
                        type="search"
                        placeholder="Search skills (e.g. React)..."
                        defaultValue={query}
                        className="pl-9 bg-white"
                    />
                </form>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {!profiles?.length ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl bg-white dashed">
                        No community members match your search.
                    </div>
                ) : (
                    profiles.map((profile) => (
                        <div key={profile.id} className="flex flex-col p-5 border rounded-xl bg-white hover:border-zinc-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-zinc-900 truncate" title={profile.name || profile.phone}>
                                    {profile.name || "Anonymous Member"}
                                </h3>
                                <div className="text-xs text-zinc-400 shrink-0">
                                    Joined {format(new Date(profile.created_at), "MMM yyyy")}
                                </div>
                            </div>
                            
                            <p className="text-sm font-medium text-zinc-700 line-clamp-1 mb-2">
                                {profile.headline || "No headline provided"}
                            </p>
                            
                            {profile.phone && (
                                <p className="text-xs text-zinc-500 mb-4 truncate cursor-pointer hover:text-zinc-900">
                                    {profile.phone}
                                </p>
                            )}
                            
                            {profile.bio && (
                                <p className="text-sm text-zinc-600 line-clamp-2 mt-auto mb-4">
                                    {profile.bio}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t flex flex-wrap gap-1.5">
                                {profile.skills && profile.skills.length > 0 ? (
                                    profile.skills.slice(0, 5).map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="font-normal text-xs bg-zinc-100">
                                            {skill}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-zinc-400 italic">No skills listed</span>
                                )}
                                {profile.skills && profile.skills.length > 5 && (
                                    <Badge variant="outline" className="text-xs">+{profile.skills.length - 5}</Badge>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
