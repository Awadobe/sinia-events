import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Dynamic params
        const title = searchParams.get('title') || 'Tech Event in Sierra Leone';
        const date = searchParams.get('date') || '';
        const cover = searchParams.get('cover');

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#18181b', // zinc-900 
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background image if provided */}
                    {cover && (
                        <img
                            src={cover}
                            alt="Cover"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.3,
                            }}
                        />
                    )}

                    {/* Grain overlay (SVG data URI) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
                            opacity: 0.15,
                            mixBlendMode: 'overlay',
                        }}
                    />

                    {/* Content Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            zIndex: 10,
                            padding: '0 80px',
                            textAlign: 'center',
                        }}
                    >
                        {/* Tag / Badge */}
                        {date && (
                            <div
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '100px',
                                    padding: '12px 24px',
                                    color: '#e4e4e7',
                                    fontSize: 24,
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    marginBottom: 40,
                                }}
                            >
                                {date}
                            </div>
                        )}

                        {/* Title */}
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                color: 'white',
                                marginBottom: 60,
                                textWrap: 'balance',
                                textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            }}
                        >
                            {title}
                        </div>

                        {/* Logo / Footer */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    background: 'white',
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#18181b', // zinc-900
                                    fontSize: 20,
                                    fontWeight: 800,
                                }}
                            >
                                CF
                            </div>
                            <div
                                style={{
                                    fontSize: 28,
                                    fontWeight: 600,
                                    color: '#e4e4e7',
                                }}
                            >
                                Sinia Events by Christex Foundation
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
