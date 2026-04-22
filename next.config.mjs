const nextConfig = {
  /* config options here */
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
