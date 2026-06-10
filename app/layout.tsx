import type { Metadata } from "next";
import { Instrument_Serif, Manrope, DM_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "D-PE.ai — AI Prompt Engineering",
  description: "Engineer precise, production-ready AI prompts through an intelligent interview process. Built on the 9-pillar framework.",
  openGraph: {
    title: "D-PE.ai — AI Prompt Engineering",
    description: "Engineer precise, production-ready AI prompts through an intelligent interview process.",
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
      className={`${instrumentSerif.variable} ${manrope.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
