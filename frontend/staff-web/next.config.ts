import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Màn chỉ hiện sau khi SessionGate có phiên (phiên nằm ở trình duyệt) nên Next không dựng được màn lúc kiểm tra điều hướng
    // tức thì và báo lỗi cho mọi màn ở dev overlay. Chỉ kiểm tra màn nào tự khai báo `instant`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
