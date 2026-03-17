"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const headline = formData.get("headline") as string;
    const bio = formData.get("bio") as string;
    const skillsString = formData.get("skills") as string;
    const optIn = formData.get("opt_in_notifications") === "true";
    
    // Convert comma-separated string back to array
    const skills = skillsString 
        ? skillsString.split(",").map(s => s.trim()).filter(Boolean)
        : [];

    const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
            id: user.id,
            name,
            headline,
            bio,
            skills,
            location: formData.get("location") as string,
            opt_in_notifications: optIn,
            phone: user.phone || undefined,
            updated_at: new Date().toISOString()
        });

    if (updateError) {
        console.error("Profile update error:", updateError);
        return { error: "Failed to update profile." };
    }

    revalidatePath("/profile");
    return { success: true };
}
