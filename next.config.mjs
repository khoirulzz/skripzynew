import withPWA from 'next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  sw: 'sw.js',
  publicExcludes: ['!sitemap.xml', '!robots.txt'],
  buildExcludes: [/chunks\/.*$/, /middleware-manifest.json$/],
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  dynamicStartUrl: true,
  reloadOnOnline: true,
  swcMinify: true,
});

const nextConfig = {
  /* config options here */
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

export default withPWAConfig(nextConfig);
