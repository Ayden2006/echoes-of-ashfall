import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echoes of Ashfall",
  description: "A cinematic pixel-art story adventure beneath Ashfall's moonlit castle.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
