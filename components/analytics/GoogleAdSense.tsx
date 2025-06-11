"use client";

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface GoogleAdSenseProps {
  clientId?: string;
}

export default function GoogleAdSense({ clientId = "ca-pub-1744086161935729" }: GoogleAdSenseProps) {
  useEffect(() => {
    // 确保AdSense脚本加载后启用自动广告
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {/* 自动广告启用脚本 */}
      <Script id="adsense-auto-ads" strategy="afterInteractive">
        {`
          (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "${clientId}",
            enable_page_level_ads: true
          });
        `}
      </Script>
    </>
  );
} 