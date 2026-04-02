import Link from "next/link";
import {
    Calendar,
    LayoutDashboard,
    LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Events", href: "/admin/events", icon: Calendar },
];

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen bg-secondary/40">
            {/* Top navigation bar */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white">
                            R
                        </span>
                        <span className="hidden sm:inline">Radius</span>
                    </Link>

                    {/* Nav links — only for logged-in admin */}
                    {user && (
                        <div className="flex items-center gap-2">
                            <nav className="flex items-center gap-1 mr-2">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </Link>
                                ))}
                            </nav>
                            <div className="h-4 w-[1px] bg-border mr-2 hidden sm:block"></div>
                            <form action={logout}>
                                <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-foreground">
                                    <LogOut className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Logout</span>
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
