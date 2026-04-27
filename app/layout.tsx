import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProveIt | AI Slop Review",
  description: "A recruiter-first proof of concept for post-LLM technical assessment."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
