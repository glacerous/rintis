import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rintis - 3D Terrain Hiking Decision-Support",
  description: "Advanced decision-support layer for mountain climbing and route exploration in Indonesia with interactive 3D terrain maps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-50">
        {children}
      </body>
    </html>
  );
}
