import Link from "next/link";
import {
    Calendar,
    LayoutDashboard,
    Plus,
    Users,
} from "lucide-react";

const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Events", href: "/admin/events", icon: Calendar },
    { label: "Create Event", href: "/admin/events/new", icon: Plus },
    { label: "Attendees", href: "/admin/attendees", icon: Users },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                            R
                        </span>
                        <span className="hidden sm:inline">Radius</span>
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-1">
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
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
