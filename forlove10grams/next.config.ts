import type { NextConfig } from 'next'

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = []

if (process.env.CLOUDFRONT_URL) {
  const { hostname } = new URL(process.env.CLOUDFRONT_URL)
  remotePatterns.push({ protocol: 'https', hostname })
}

if (process.env.S3_BUCKET_NAME && process.env.AWS_REGION) {
  remotePatterns.push({
    protocol: 'https',
    hostname: `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
  })
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
}

export default nextConfig
