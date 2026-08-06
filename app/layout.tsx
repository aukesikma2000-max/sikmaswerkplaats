import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Sikma's Werkplaats",
  description: 'Professionele UI voor reparaties en ophalen van naaimachines',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="font-sans">{children}</body>
    </html>
  );
}
