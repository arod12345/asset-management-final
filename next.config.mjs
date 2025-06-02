/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'img.clerk.com',
      'images.clerk.dev',
      'clerk.com',
      'res.cloudinary.com', // Added Cloudinary hostname
    ],
  },
};

export default nextConfig;
