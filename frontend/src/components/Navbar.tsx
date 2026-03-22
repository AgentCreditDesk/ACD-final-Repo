"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/borrower", label: "Borrow" },
    { href: "/treasury", label: "Treasury" },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="ACD Logo"
              width={200}
              height={200}
              className="w-8 h-8 object-contain transition-all"
              style={{ filter: "brightness(1.5) drop-shadow(0 0 12px rgba(0,194,168,0.6))" }}
            />
            <span className="text-white/90 font-semibold text-lg hidden sm:block tracking-tight">
              Agent Credit Desk
            </span>
          </Link>

          {/* Nav + Wallet */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    pathname === link.href
                      ? "text-teal"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-teal to-transparent" />
                  )}
                </Link>
              ))}
            </div>

            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div
                    {...(!mounted && {
                      "aria-hidden": true,
                      style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
                    })}
                  >
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        className="px-5 py-2 bg-gradient-to-r from-teal/90 to-teal/70 text-white text-sm font-medium rounded-lg hover:from-teal hover:to-teal/80 transition-all glow-teal"
                      >
                        Connect Wallet
                      </button>
                    ) : chain.unsupported ? (
                      <button
                        onClick={openChainModal}
                        className="px-4 py-2 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/30 hover:bg-red-500/30"
                      >
                        Wrong Network
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          className="px-3 py-1.5 glass text-white/60 text-xs rounded-lg hover:text-white/80 transition-colors"
                        >
                          {chain.name}
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="px-3 py-1.5 glass text-teal text-sm font-mono rounded-lg hover:glow-teal transition-all"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </nav>
  );
}
