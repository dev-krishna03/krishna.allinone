import './globals.css';

export const metadata = {
  title: 'SaaS Super Admin | Unified Business OS',
  description: 'Privacy-safe operational control and platform metrics',
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
