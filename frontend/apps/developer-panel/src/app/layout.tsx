import './globals.css';

export const metadata = {
  title: 'Developer Console | Unified Business OS',
  description: 'Diagnostics, API Keys, and Event Outbox Replay',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAF9F5] text-[#141413] antialiased">
        {children}
      </body>
    </html>
  );
}
