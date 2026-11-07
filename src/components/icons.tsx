"use client";

/* ============================================================
 * EzFameNp — inline SVG brand & platform icons.
 * Every icon is embedded (no external images) so they can never
 * fail to load. Stroke icons inherit `currentColor`.
 * ============================================================ */

import type { PlatformId } from "@/lib/types";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Stroke({ children, size = 20, className, strokeWidth = 1.8 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Fill({ children, size = 20, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Instagram = (p: IconProps) => (
  <Stroke {...p}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </Stroke>
);

const Youtube = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </Stroke>
);

const Facebook = (p: IconProps) => (
  <Fill {...p}>
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </Fill>
);

const TikTok = (p: IconProps) => (
  <Fill {...p}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </Fill>
);

const Telegram = (p: IconProps) => (
  <Fill {...p}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </Fill>
);

const XTwitter = (p: IconProps) => (
  <Fill {...p}>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </Fill>
);

const Clubhouse = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
    <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
  </Stroke>
);

const LinkedIn = (p: IconProps) => (
  <Fill {...p}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </Fill>
);

const GooglePlus = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <text
      x="12"
      y="17.5"
      textAnchor="middle"
      fontSize="15"
      fontWeight="800"
      fontFamily="inherit"
      fill="currentColor"
    >
      G+
    </text>
  </svg>
);

const Likee = (p: IconProps) => (
  <Fill {...p}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Fill>
);

const Spotify = (p: IconProps) => (
  <Fill {...p}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </Fill>
);

const Pinterest = (p: IconProps) => (
  <Fill {...p}>
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.739a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </Fill>
);

const Pubg = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="8" />
    <line x1="12" x2="12" y1="1" y2="4" />
    <line x1="12" x2="12" y1="20" y2="23" />
    <line x1="1" x2="4" y1="12" y2="12" />
    <line x1="20" x2="23" y1="12" y2="12" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </Stroke>
);

const FreeFire = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Stroke>
);

const MobileLegends = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" x2="19" y1="19" y2="13" />
    <line x1="16" x2="20" y1="16" y2="20" />
    <line x1="19" x2="21" y1="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 10" />
    <line x1="5" x2="9" y1="14" y2="18" />
    <line x1="7" x2="4" y1="17" y2="20" />
    <line x1="3" x2="5" y1="19" y2="21" />
  </Stroke>
);

const Valorant = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M2.6 3.5h6.1c.4 0 .7.4.6.8l-1 3.2c-.1.3-.4.5-.7.5H5.2c-.3 0-.5.3-.4.6l1.8 5.6c.1.4.8.4 1-.1l2.1-6.6c.1-.3.4-.5.7-.5h2.9c.3 0 .6.2.7.5l2.1 6.6c.2.5.9.5 1 .1l1.8-5.6c.1-.3-.1-.6-.4-.6h-2.4c-.3 0-.6-.2-.7-.5l-1-3.2c-.1-.4.2-.8.6-.8h6.1c.4 0 .8.4.6.9L14.7 20c-.1.3-.4.5-.7.5h-3.9c-.3 0-.6-.2-.7-.5L2 4.4c-.2-.5.2-.9.6-.9z"
    />
  </svg>
);

const Roblox = (p: IconProps) => (
  <Stroke {...p}>
    <rect width="15" height="15" x="4.5" y="4.5" rx="2.5" transform="rotate(12 12 12)" />
    <rect width="5" height="5" x="9.5" y="9.5" rx="1" fill="currentColor" stroke="none" transform="rotate(12 12 12)" />
  </Stroke>
);

const REGISTRY: Record<string, (p: IconProps) => React.JSX.Element> = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  tiktok: TikTok,
  telegram: Telegram,
  twitter: XTwitter,
  clubhouse: Clubhouse,
  linkedin: LinkedIn,
  googleplus: GooglePlus,
  likee: Likee,
  spotify: Spotify,
  pinterest: Pinterest,
  pubg: Pubg,
  freefire: FreeFire,
  mobilelegends: MobileLegends,
  valorant: Valorant,
  roblox: Roblox,
};

export function PlatformIcon({
  id,
  size = 20,
  className,
  strokeWidth,
}: {
  id: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = REGISTRY[id] ?? REGISTRY.instagram;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
}

/** Animated brand logo — hexagon core + orbiting node */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ezfamenp-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="0.55" stopColor="#34d399" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 41.5 13.75v20.5L24 44.5 6.5 34.25v-20.5z"
        fill="none"
        stroke="url(#ezfamenp-logo-grad)"
        strokeWidth="2.6"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M19 16.5h11M19 24h8.5M19 31.5h11M19 16.5v15"
        fill="none"
        stroke="url(#ezfamenp-logo-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="33.6" cy="24" r="2.1" fill="#fbbf24">
        <animate attributeName="opacity" values="1;0.35;1" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Payment method glyphs (inline, brand-safe) */
export function PayGlyph({ method, size = 22, className }: { method: string; size?: number; className?: string }) {
  switch (method) {
    case "crypto":
      return (
        <Stroke size={size} className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 8h4a2.2 2.2 0 0 1 0 4.4h-4zm0 4.4h4.4a2.2 2.2 0 0 1 0 4.4H9.5zM11 6.2v1.8M11 16.4v1.8" />
        </Stroke>
      );
    case "esewa":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#60BB46" />
          <text
            x="12"
            y="14.8"
            textAnchor="middle"
            fontSize="6.4"
            fontWeight="800"
            fill="#fff"
            fontFamily="inherit"
            textLength="16"
            lengthAdjust="spacingAndGlyphs"
          >
            eSEWA
          </text>
        </svg>
      );
    case "khalti":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#5C2D91" />
          <text
            x="12"
            y="14.8"
            textAnchor="middle"
            fontSize="6.4"
            fontWeight="800"
            fill="#fff"
            fontFamily="inherit"
            textLength="14"
            lengthAdjust="spacingAndGlyphs"
          >
            Khalti
          </text>
        </svg>
      );
    case "bank":
      return (
        <Stroke size={size} className={className}>
          <path d="M3 21h18M4 10h16M12 3 4 8h16zM6 10v8M10 10v8M14 10v8M18 10v8" />
        </Stroke>
      );
    default:
      return null;
  }
}
