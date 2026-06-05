import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import "./globals.css";

const brice = localFont({
  src: [
    { path: "../public/fonts/Brice-Bold.otf", weight: "700" },
    { path: "../public/fonts/Brice-Black.otf", weight: "900" },
  ],
  variable: "--font-brice",
  display: "swap",
});

const mundial = localFont({
  src: [
    { path: "../public/fonts/Mundial-Regular.otf", weight: "400" },
    { path: "../public/fonts/MundialDemibold.otf", weight: "600" },
    { path: "../public/fonts/Mundial-Bold.otf", weight: "700" },
  ],
  variable: "--font-mundial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VIBE BATTLE — GVC Card Game",
  description: "Collect, battle and flex your GVC NFT trading cards. Rip packs, build a deck, and battle for glory. Built for the GVC Vibeathon by @imaesr.",
  icons: {
    icon: "/shaka.png",
    apple: "/shaka.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "VIBE BATTLE — GVC Card Game 🤙",
    description: "Rip packs · Build a deck · Battle for glory. The GVC NFT trading card game.",
    url: "https://aesr-gvc.vercel.app",
    siteName: "VIBE BATTLE",
    images: [{ url: "https://aesr-gvc.vercel.app/GVC Card Battle.png", width: 1200, height: 630, alt: "VIBE BATTLE — GVC Card Game" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIBE BATTLE — GVC Card Game 🤙",
    description: "Rip packs · Build a deck · Battle for glory. The GVC NFT trading card game.",
    images: ["https://aesr-gvc.vercel.app/GVC Card Battle.png"],
    creator: "@imaesr",
  },
  themeColor: "#c084fc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${brice.variable} ${mundial.variable} font-body`}>
        <Providers>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1F1F1F",
              color: "#ffffff",
              border: "1px solid rgba(255, 224, 72, 0.2)",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        </Providers>
      </body>
    </html>
  );
}
