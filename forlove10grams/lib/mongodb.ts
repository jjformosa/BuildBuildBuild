import mongoose, { type Mongoose } from 'mongoose'
import fs from 'fs'
import path from 'path'
import os from 'os'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_CERT_BASE64 = process.env.MONGODB_CERT_BASE64

if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined')
if (!MONGODB_CERT_BASE64) throw new Error('MONGODB_CERT_BASE64 is not defined')

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: Mongoose | null; promise: Promise<Mongoose> | null }
}

const cached = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cached

function getCertPath(): string {
  const certPath = path.join(os.tmpdir(), 'mongodb-forlove-cert.pem')
  if (!fs.existsSync(certPath)) {
    const certContent = Buffer.from(MONGODB_CERT_BASE64!, 'base64').toString('utf-8')
    fs.writeFileSync(certPath, certContent, { mode: 0o600 })
  }
  return certPath
}

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      tlsCertificateKeyFile: getCertPath(),
      authMechanism: 'MONGODB-X509',
      authSource: '$external',
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
