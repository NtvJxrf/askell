/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile the workspace package so `@askell/shared/permissions` can be
  // imported from server and client components.
  transpilePackages: ['@askell/shared'],
  // Логировать в консоль (dev-режим) каждый fetch(), выполненный на
  // сервере (Server Components, Route Handlers, apiFetch и т.д.), вместе
  // со статусом кэша.
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
