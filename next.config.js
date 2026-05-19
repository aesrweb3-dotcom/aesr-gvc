/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["goodvibesclub.ai"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "goodvibesclub.ai",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
