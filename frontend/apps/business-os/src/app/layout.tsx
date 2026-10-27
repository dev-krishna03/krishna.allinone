import './globals.css';

export const metadata = {
  title: 'Unified Business OS',
  description: 'Enterprise Multitenant Operating System',
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
