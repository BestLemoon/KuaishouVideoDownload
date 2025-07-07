import "@/app/globals.css";

import { getMessages, getTranslations } from "next-intl/server";

import { AppContextProvider } from "@/contexts/app";
import { Inter as FontSans } from "next/font/google";
import { Metadata } from "next";
import { NextAuthSessionProvider } from "@/auth/session";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/providers/theme";

import { cn } from "@/lib/utils";
import Script from "next/script";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});



export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations();

  const siteName = t("metadata.title") || "TwitterDown";
  const defaultDescription = t("metadata.description") || "Download Twitter videos quickly and easily.";
  const defaultKeywords = t("metadata.keywords") || "twitter, video, download, twitterdown";
  const defaultOgImage = `${process.env.NEXT_PUBLIC_WEB_URL}/og-preview.png`; // Assuming logo.png is in public folder

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || "https://twitterdown.com"),
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`,
    },
    title: {
      template: `%s | ${siteName}`,
      default: siteName,
    },
    description: defaultDescription,
    keywords: defaultKeywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: { 
        template: `%s | ${siteName}`,
        default: siteName,
      },
      description: defaultDescription,
      siteName: siteName,
      images: [
        {
          url: defaultOgImage,
          width: 512, // Provide actual width of logo.png if known, otherwise a generic one
          height: 512, // Provide actual height of logo.png if known
          alt: `${siteName} Logo`,
        },
      ],
      locale: locale,
      type: "website", // Default type, can be overridden by pages like 'article' for blog posts
    },
    twitter: {
      card: "summary_large_image", // Default card type
      title: { 
        template: `%s | ${siteName}`,
        default: siteName,
      },
      description: defaultDescription,
      images: [defaultOgImage], // Twitter can also use an array of image URLs
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Define isSpace function globally to fix markdown-it issues with Next.js + Turbopack */}
        <Script id="markdown-it-fix" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && typeof window.isSpace === 'undefined') {
              window.isSpace = function(code) {
                return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0B || code === 0x0C || code === 0x0D;
              };
            }
            // Also define globally for Node.js environments
            if (typeof global !== 'undefined' && typeof global.isSpace === 'undefined') {
              global.isSpace = function(code) {
                return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0B || code === 0x0C || code === 0x0D;
              };
            }
          `}
        </Script>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1744086161935729"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {/* Ahrefs Analytics */}
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="eNi3JPRqg9e54JhRd3dARw"
          async
          strategy="afterInteractive"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased overflow-x-hidden",
          fontSans.variable
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <NextAuthSessionProvider>
            <AppContextProvider>
              <ThemeProvider attribute="class" disableTransitionOnChange>
                {children}
              </ThemeProvider>
            </AppContextProvider>
          </NextAuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
