import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { person } from "@/content/portfolio";
import "./globals.css";

const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

// Absolute base for canonical and social-preview URLs. SITE_URL should be the real domain in production;
// on Vercel the project's production hostname is used if SITE_URL is missing, so links never point at localhost.
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${person.name} · Software developer from Assam`, template: `%s · ${person.name}` },
  description: person.siteDescription,
  applicationName: person.name,
  authors: [{ name: person.name }],
  openGraph: {
    type: "website",
    title: `${person.name} · Software developer from Assam`,
    description: person.siteDescription,
    siteName: person.name,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0B0E0D",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint: sets motion classes from the stored or system preference.
const INIT = `(function(){var d=document.documentElement;d.classList.add('js');var m='system';try{m=localStorage.getItem('ab.motion')||'system'}catch(e){}var r=m==='reduce'||(m==='system'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);d.classList.add(r?'reduce':'motion');})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
