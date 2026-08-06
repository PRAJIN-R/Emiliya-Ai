import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Knowledge Assistant",
  description: "Zero-cost multimodal AI platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
