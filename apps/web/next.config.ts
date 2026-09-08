import "@gfinancias/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    distDir: process.env.NEXT_DIST_DIR ?? ".next",
    typedRoutes: true,
    reactCompiler: true,
};

export default nextConfig;
