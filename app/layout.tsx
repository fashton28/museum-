import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Mono, VT323 } from 'next/font/google';
import './globals.css';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono-2',
});

const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono-3',
});

export const metadata: Metadata = {
  title: 'The Future of Humanity',
  description: 'An oral history of AI. Dwarkesh Patel.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexMono.variable} ${spaceMono.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
