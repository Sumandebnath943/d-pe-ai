import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };
    return config;
  },
  serverExternalPackages: ['onnxruntime-node'],
  turbopack: {}
};

export default nextConfig;
