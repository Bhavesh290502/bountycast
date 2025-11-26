// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BountyCast',
  description: 'Bounty Q&A for Farcaster',
  openGraph: {
    title: 'BountyCast',
    description: 'Bounty Q&A for Farcaster',
    images: ['https://bountycast.vercel.app/opengraph-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BountyCast',
    description: 'Bounty Q&A for Farcaster',
    images: ['https://bountycast.vercel.app/opengraph-image.png'],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: 'https://bountycast.vercel.app/opengraph-image.png',
      button: {
        title: 'Launch App',
        action: {
          type: 'launch_frame',
          name: 'BountyCast',
          url: 'https://bountycast.vercel.app',
          splashImageUrl: 'https://bountycast.vercel.app/splash.png',
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
