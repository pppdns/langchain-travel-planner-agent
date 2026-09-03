import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travel planner · Public demo",
  description:
    "A public LangGraph travel planner whose Orchestration Atlas is the live execution path.",
  openGraph: {
    title: "Travel planner",
    description: "Watch LangGraph plan a trip in public, including interrupt and resume.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-text">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
