import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

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
      <body className={`${dmSans.variable} ${cormorantGaramond.variable} antialiased min-h-screen bg-zinc-950 text-slate-50 font-sans`}>
        {children}
      </body>
    </html>
  );
}
