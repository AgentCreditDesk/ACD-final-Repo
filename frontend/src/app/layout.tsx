import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Web3Provider from "@/lib/web3-provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Agent Credit Desk",
  description: "Autonomous AI-powered USDT lending on Base Sepolia — powered by Tether WDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sora.variable} ${jetbrains.variable} antialiased min-h-screen`}
        style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}
      >
        {/* Background layers */}
        <div className="dot-grid" />
        <div className="grain-overlay" />

        {/* Content */}
        <div className="relative z-10">
          <Web3Provider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </Web3Provider>
        </div>
      </body>
    </html>
  );
}
