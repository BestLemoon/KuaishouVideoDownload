import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import mdx from "@next/mdx";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

const withMDX = mdx({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  experimental: {
    // 禁用 Link 组件的自动 prefetch
    linkNoPreload: true,
    // 禁用 touchstart 事件的 prefetch
    linkNoTouchStart: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  async redirects() {
    return [
      // Redirect Twitter-like status URLs to our API handler
      {
        source: '/:locale/:username/status/:statusId',
        destination: '/api/redirect-status?username=:username&statusId=:statusId',
        permanent: false,
      },
      // Redirect status URLs without locale to our API handler
      {
        source: '/:username/status/:statusId',
        destination: '/api/redirect-status?username=:username&statusId=:statusId',
        permanent: false,
      },
      // Catch any other paths containing 'status' and redirect to home
      {
        source: '/:path*/status/:rest*',
        destination: '/',
        permanent: false,
      },
    ];
  },

};

// Make sure experimental mdx flag is enabled
const configWithMDX = {
  ...nextConfig,
  experimental: {
    mdxRs: true,
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(configWithMDX)));