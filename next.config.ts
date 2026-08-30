import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Defensive headroom above the 8 MiB resumable-upload chunk size. The
    // default proxy body buffer is 10MB; 16MB keeps 8 MiB parts (plus any
    // multipart/proxy overhead) safely below the truncation limit without
    // inflating the buffer to a value that masks architecture problems.
    proxyClientMaxBodySize: '16mb',
  },
};

export default nextConfig;
