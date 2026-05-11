import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://invoiceflow.app"),
  title: {
    default: "InvoiceFlow — USDC invoices for freelancers",
    template: "%s · InvoiceFlow",
  },
  description:
    "Solana-native invoice + escrow protocol. Get paid in USDC with milestone-based release and dispute timeouts. No frozen accounts.",
  keywords: [
    "Solana",
    "USDC",
    "invoice",
    "escrow",
    "freelancer",
    "payments",
    "Nigeria",
    "Raenest",
    "stablecoin",
  ],
  openGraph: {
    title: "InvoiceFlow — USDC invoices for freelancers",
    description:
      "Get paid in USDC. No frozen accounts. Solana-native invoice + escrow protocol.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "InvoiceFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoiceFlow",
    description:
      "Get paid in USDC. No frozen accounts. Solana-native invoice + escrow protocol.",
    images: ["/og.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
