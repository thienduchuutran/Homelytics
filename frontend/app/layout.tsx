import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import ChatWidget from "@/components/chat/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Homelytics — California Real Estate Search",
  description: "Homelytics is a California real estate search and analytics web application that lets users browse MLS-grade property listings (imported from a RETS database), view them on an interactive map, analyze market statistics, save favorites with notes and tags, and ask a Gemini-powered AI chat assistant to find properties using natural language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={children}>
          <PageTransition>
            {children}
          </PageTransition>
        </Suspense>
        <ChatWidget />
      </body>
    </html>
  );
}
