import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EzFame — SMM & Game Top-Up Store",
  description:
    "Nepal's fastest SMM & in-game top-up store. Instagram, YouTube, TikTok, Telegram growth + PUBG UC, Free Fire Diamonds & more. Pay with eSewa, Khalti, bank or crypto.",
  keywords: [
    "SMM panel Nepal",
    "game top-up",
    "PUBG UC",
    "Free Fire diamonds",
    "followers",
    "eSewa",
    "Khalti",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "EzFame — SMM & Game Top-Up Store",
    description: "Instant social media growth & game top-ups. USD ⇄ NPR. eSewa · Khalti · Crypto.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e0d",
};

/* pre-hydration theme + language boot (prevents flash & mismatch) */
const themeBoot = `
try {
  var s = JSON.parse(localStorage.getItem('ezfame:ui') || '{}');
  var t = (s && s.state && s.state.theme) || 'dark';
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.dataset.theme = t;
  var l = localStorage.getItem('ezfame:lang');
  if (l && l !== 'en') {
    document.documentElement.lang = l;
    document.documentElement.classList.add('lang-deva');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router <head> fonts are global */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
