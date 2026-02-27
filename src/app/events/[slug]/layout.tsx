import type { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Props = {
    params: { slug: string };
};

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = params;

    // Fetch event details for metadata
    const { data: event } = await supabaseAdmin
        .from('events')
        .select('title, description, date, image_url')
        .eq('slug', slug)
        .single();

    if (!event) {
        return {
            title: 'Event Not Found | Sinia Events',
        };
    }

    const appUrl = getBaseUrl();
    const ogUrl = new URL(`${appUrl}/api/og/event`);
    ogUrl.searchParams.set('title', event.title);

    // Format date nicely for the social card (e.g. "January 15")
    const dateObj = new Date(event.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    ogUrl.searchParams.set('date', formattedDate);

    if (event.image_url) {
        ogUrl.searchParams.set('cover', event.image_url);
    }

    const description = event.description
        ? (event.description.length > 150 ? event.description.substring(0, 147) + '...' : event.description)
        : `Join us for ${event.title} hosted by Christex Foundation`;

    return {
        title: `${event.title} | Sinia Events`,
        description,
        openGraph: {
            title: event.title,
            description,
            url: `${appUrl}/events/${slug}`,
            siteName: 'Sinia Events',
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: event.title,
                },
            ],
            locale: 'en_US',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: event.title,
            description,
            images: [ogUrl.toString()],
        },
    };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
    // We just return the children; the layout exists purely to set the Server-side metadata
    // since page.tsx is a "use client" component.
    return <>{children}</>;
}
