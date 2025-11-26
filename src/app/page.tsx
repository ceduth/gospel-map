'use client';

import dynamic from 'next/dynamic';

const GospelMap = dynamic(() => import('@/components/GospelMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <GospelMap />
    </main>
  );
}