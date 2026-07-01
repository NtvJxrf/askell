/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile the workspace package so `@askell/shared/permissions` can be
  // imported from server and client components.
  transpilePackages: ['@askell/shared'],
};

export default nextConfig;
