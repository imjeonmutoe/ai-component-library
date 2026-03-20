import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Component Library Demo',
  description: 'AI-first React component library showcase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}