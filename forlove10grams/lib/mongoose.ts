import mongoose from 'mongoose'
import { mongodbCertPath } from './cert'

const MONGODB_URI = process.env.MONGODB_URI!

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

const cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null })

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = { bufferCommands: false }
    const certPath = mongodbCertPath()
    if (certPath) opts.tlsCertificateKeyFile = certPath
    cached.promise = mongoose.connect(MONGODB_URI, opts)
  }
  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }
  return cached.conn
}
