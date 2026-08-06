import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Sikma's Werkplaats",
  description: 'Professionele UI voor reparaties en ophalen van naaimachines',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
    shortcut: ['/icon.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="font-sans">{children}</body>
    </html>
  );
}
