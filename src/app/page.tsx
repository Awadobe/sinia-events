import Link from "next/link";
import { ArrowRight, Calendar, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              S
            </span>
            Sinia Events
          </Link>
          <Link href="/admin/events/new">
            <Button size="sm" variant="outline">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          Open-source event platform
        </div>

        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Events &amp; community,
          <br />
          <span className="text-primary">all in one place.</span>
        </h1>

        <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Discover bootcamps, workshops, hackathons, and meetups by Christex
          Foundation. Register in seconds. Never miss an event.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/events">
            <Button size="lg" className="gap-2">
              Browse Events <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/admin/events/new">
            <Button size="lg" variant="outline" className="gap-2">
              Create an Event
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center sm:gap-16">
          <div>
            <div className="flex justify-center text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="mt-1 text-2xl font-bold">15+</p>
            <p className="text-xs text-muted-foreground">Events planned</p>
          </div>
          <div>
            <div className="flex justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-1 text-2xl font-bold">300+</p>
            <p className="text-xs text-muted-foreground">Community members</p>
          </div>
          <div>
            <div className="flex justify-center text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <p className="mt-1 text-2xl font-bold">100%</p>
            <p className="text-xs text-muted-foreground">Open source</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Christex Foundation &middot; Sinia
          Events
        </p>
      </footer>
    </div>
  );
}
