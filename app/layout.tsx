import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Trashketball — Out of Office',
  description:
    'Clock out. Crumple up. A 3D paper-toss game from the severed floor to the ocean shore.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
