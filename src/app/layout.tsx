import type { Metadata } from "next";
import { Inter, Righteous } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const righteous = Righteous({
  variable: "--font-righteous",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boombox B-Sides",
  description:
    "Find music Spotify's own algorithm won't show you — dig deeper, go more obscure.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${righteous.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
