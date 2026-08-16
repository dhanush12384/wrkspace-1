import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
});
const BRAND_BLUE = "#0047FF";
const SF_MONITORING_ENABLED = process.env.NEXT_PUBLIC_SF_MONITORING_ENABLED === "true";
const SF_BASE_URL = process.env.NEXT_PUBLIC_SF_BASE_URL || "https://admin-iota-lyart-50.vercel.app";
const SF_CLIENT_ID = process.env.NEXT_PUBLIC_SF_CLIENT_ID || "ada4670d-ff26-441f-806d-f089e8f13ece";
const SF_PROPERTY_ID = process.env.NEXT_PUBLIC_SF_PROPERTY_ID || "76b12b60-feb0-4c2a-8e77-6cc086d74813";
const SF_APP_VERSION = process.env.NEXT_PUBLIC_SF_APP_VERSION || "2.0";
const SF_METRICS_INGEST_KEY = process.env.NEXT_PUBLIC_SF_METRICS_INGEST_KEY || "sfm_k8N4xQ2vR7pL1tY5cD9hJ3mB6uW0";
const SF_CRASH_INGEST_KEY = process.env.NEXT_PUBLIC_SF_ENABLE_BROWSER_CRASH_INGEST === "false"
    ? ""
    : process.env.NEXT_PUBLIC_SF_CRASH_INGEST_KEY || "sfc_v4Pz8nT1wR6qK3yM9bH2dL5xC7";
const SF_HEARTBEAT_INTERVAL_SEC = Number(process.env.NEXT_PUBLIC_SF_HEARTBEAT_INTERVAL_SEC || "300");
const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_ID || "G-6BHGEMXDT1";
export const viewport: Viewport = {
    themeColor: BRAND_BLUE,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: "light",
};
export const metadata: Metadata = {
    title: "wrkspace",
    description: "A firm of software and IT wing",
    authors: [{ name: "redlix pro wing", url: "https://www.redlix.co.in" }],
    publisher: "www.podtem.co.in",
    applicationName: "wrkspace",
    appleWebApp: {
        capable: true,
        title: "wrkspace",
        statusBarStyle: "black-translucent",
    },
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "https://ik.imagekit.io/dypkhqxip/wrkspacefavivon", type: "image/png" },
            { url: "/branding/favicon.png", type: "image/png" },
            { url: "/icon.png", type: "image/png" },
        ],
        apple: "https://ik.imagekit.io/dypkhqxip/wrkspacefavivon",
        shortcut: "https://ik.imagekit.io/dypkhqxip/wrkspacefavivon",
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};
import { ThemeProvider } from "@/components/theme-provider";
import { ChunkReloadGuard } from "@/components/chunk-reload-guard";
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=account_circle" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=contact_support" />
      </head>
      <body className="min-h-full flex flex-col">
        
        <Script id="purge-sw" strategy="beforeInteractive">{`
          try {
            var FLAG = 'wrkspace_sw_purged_v3';
            if (localStorage.getItem(FLAG) === '1') { /* already done */ }
            else if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                return Promise.all(regs.map(function(r) { return r.unregister(); }));
              }).then(function() {
                try { localStorage.setItem(FLAG, '1'); } catch (e) {}
              });
            }
          } catch (e) {}
        `}</Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`} strategy="afterInteractive"/>
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_MEASUREMENT_ID}');
        `}</Script>
        {SF_MONITORING_ENABLED ? (<>
            <Script src="/studentforge/browser-monitor.js" strategy="afterInteractive"/>
            <Script id="studentforge-monitor-init" strategy="afterInteractive">{`
              (function initStudentForgeMonitor() {
                try {
                  if (!window.StudentForgeMonitor || !window.StudentForgeMonitor.init) return;
                  window.StudentForgeMonitor.init({
                    baseUrl: ${JSON.stringify(SF_BASE_URL)},
                    clientId: ${JSON.stringify(SF_CLIENT_ID)},
                    propertyId: ${JSON.stringify(SF_PROPERTY_ID)},
                    metricsIngestKey: ${JSON.stringify(SF_METRICS_INGEST_KEY)},
                    crashIngestKey: ${JSON.stringify(SF_CRASH_INGEST_KEY)},
                    appVersion: ${JSON.stringify(SF_APP_VERSION)},
                    heartbeatIntervalSec: ${Number.isFinite(SF_HEARTBEAT_INTERVAL_SEC) ? SF_HEARTBEAT_INTERVAL_SEC : 300},
                    debug: false
                  });
                } catch (_err) {}
              })();
            `}</Script>
          </>) : null}
        <ChunkReloadGuard />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>);
}
