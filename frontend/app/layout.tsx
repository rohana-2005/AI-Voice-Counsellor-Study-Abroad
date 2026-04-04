import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "StudyAbroad.AI – AI-Powered Study Abroad Counselor",
  description:
    "Get personalized university recommendations, readiness scores, and expert guidance powered by AI. Trusted by 40,000+ students worldwide.",
  keywords: "study abroad, AI counselor, university recommendations, UK universities, Ireland universities, Canada universities",
  openGraph: {
    title: "StudyAbroad.AI – AI-Powered Study Abroad Counselor",
    description: "Get personalized university recommendations instantly with AI-powered counseling.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
