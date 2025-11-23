// app/layout.tsx
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BountyCast',
  description: 'Bounty Q&A for Farcaster',
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
