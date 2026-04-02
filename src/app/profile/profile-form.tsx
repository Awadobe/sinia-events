"use client";

import { useState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Profile = {
    name?: string | null;
    headline?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    opt_in_notifications?: boolean;
    location?: string | null;
};

export function ProfileForm({ profile, email }: { profile?: Profile | null, email: string }) {
    const [loading, setLoading] = useState(false);
    
    // Skills management
    const [skills, setSkills] = useState<string[]>(profile?.skills || []);
    const [skillInput, setSkillInput] = useState("");
    const [optIn, setOptIn] = useState(profile?.opt_in_notifications ?? true);

    const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = skillInput.trim();
            if (val && !skills.includes(val)) {
                setSkills([...skills, val]);
            }
            setSkillInput("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        // Append skills array as comma separated string
        formData.append("skills", skills.join(","));
        formData.append("opt_in_notifications", optIn ? "true" : "false");

        const result = await updateProfile(formData);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Profile updated successfully!");
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email-login">Email (Login)</Label>
                <Input id="email-login" value={email} disabled className="bg-zinc-50" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="location">City / Location</Label>
                <Input 
                    id="location" 
                    name="location" 
                    defaultValue={profile?.location || ""} 
                    placeholder="e.g. Freetown" 
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                    id="name" 
                    name="name" 
                    defaultValue={profile?.name || ""} 
                    placeholder="Jane Doe" 
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input 
                    id="headline" 
                    name="headline" 
                    defaultValue={profile?.headline || ""} 
                    placeholder="Software Engineer at Stark Industries" 
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                    id="bio" 
                    name="bio" 
                    defaultValue={profile?.bio || ""} 
                    placeholder="Tell the community a little about yourself..." 
                    rows={4}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="px-2 py-1 text-sm bg-zinc-100/80">
                            {skill}
                            <button 
                                type="button" 
                                onClick={() => removeSkill(skill)}
                                className="ml-1.5 text-zinc-500 hover:text-zinc-800"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <Input 
                    id="skills" 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={addSkill}
                    placeholder="Type a skill and press Enter (e.g. React, UX Design)" 
                />
                <p className="text-xs text-muted-foreground">Press Enter to add multiple skills.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 mt-6">
                <div className="space-y-0.5">
                    <Label className="text-base">Event Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                        Receive SMS/WhatsApp notifications when new events are published.
                    </p>
                </div>
                <Switch
                    checked={optIn}
                    onCheckedChange={setOptIn}
                />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
            </Button>
        </form>
    );
}
