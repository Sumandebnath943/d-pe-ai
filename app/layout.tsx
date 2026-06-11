import type { Metadata } from "next";
import { Instrument_Serif, Manrope, DM_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

// Variable font — no explicit weight needed. Used by the terminal landing console.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "D-PE.ai | God-Tier Prompt Engineering",
  description: "Engineer precise, production-ready AI prompts through an intelligent, socratic interview process.",
  openGraph: {
    title: "D-PE.ai",
    description: "Engineer precise, production-ready AI prompts.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${manrope.variable} ${dmMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
