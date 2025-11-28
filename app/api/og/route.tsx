import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Get params
        const title = searchParams.get('title')?.slice(0, 100) || 'New Bounty';
        const bounty = searchParams.get('bounty') || '0';
        const username = searchParams.get('username') || 'Anon';

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
                        backgroundColor: '#0f0f13', // Dark background
                        backgroundImage: 'radial-gradient(circle at 25px 25px, #2a2a35 2%, transparent 0%), radial-gradient(circle at 75px 75px, #2a2a35 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        fontFamily: 'sans-serif',
                        padding: '40px',
                        textAlign: 'center',
                    }}
                >
                    {/* Logo / Brand */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                        }}
                    >
                        <span style={{ fontSize: 30, color: '#8b5cf6', fontWeight: 'bold' }}>⚡ BountyCast</span>
                    </div>

                    {/* Bounty Amount */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            marginBottom: '20px',
                            padding: '20px 40px',
                            border: '2px solid #fbbf24',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '2px' }}>REWARD</span>
                        <span style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{bounty} ETH</span>
                    </div>

                    {/* Question */}
                    <div
                        style={{
                            fontSize: 40,
                            fontWeight: 'bold',
                            color: 'white',
                            marginBottom: '20px',
                            lineHeight: 1.4,
                            maxWidth: '900px',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}
                    >
                        {title}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${username}&background=random`}
                            width="40"
                            height="40"
                            style={{ borderRadius: '50%' }}
                        />
                        <span style={{ fontSize: 24, color: '#9ca3af' }}>Posted by <span style={{ color: '#fff', fontWeight: 'bold' }}>@{username}</span></span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
