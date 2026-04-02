import Link from "next/link";

export default function CreateEventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#faf9f7]">
            {/* Minimal header — no admin nav */}
            <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900"
                    >
                        <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            R
                        </div>
                        Radius
                    </Link>
                    <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Create Event
                    </div>
                </div>
            </header>

            {/* Content */}
            {children}
        </div>
    );
}
