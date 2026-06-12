import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KidVenture — Learn & Play",
  description:
    "A playful learning world for ages 6–10: reading, math, logic and art.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4FC3F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Fonts load at runtime with graceful system fallbacks,
            so offline builds and flaky networks never break the app. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Quicksand:wght@400;500;600&family=Noto+Sans+Devanagari:wght@600&family=Noto+Sans+Kannada:wght@600&family=Noto+Sans+Tamil:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-cream min-h-dvh overscroll-none select-none">
        {children}
      </body>
    </html>
  );
}
