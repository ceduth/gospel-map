import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jesus Film Project Plays Map',
  description: 'Daily playback of worldwide media views',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}