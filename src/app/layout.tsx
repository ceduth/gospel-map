import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: ' Jesus Film Project User Map',
  description: 'Real-time world map of gospel views and exposures',
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