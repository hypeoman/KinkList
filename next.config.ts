import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath =
  configuredBasePath || (process.env.GITHUB_ACTIONS ? `/${repositoryName}` : "");

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  basePath,
  assetPrefix: basePath || undefined
};

export default nextConfig;
