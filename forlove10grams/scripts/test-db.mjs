import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const value = trimmed.slice(eq + 1).trim()
  if (key && value) process.env[key] = value
}

const { MONGODB_URI, MONGODB_CERT_BASE64 } = process.env

if (!MONGODB_URI) { console.error('MONGODB_URI is not set'); process.exit(1) }
if (!MONGODB_CERT_BASE64) { console.error('MONGODB_CERT_BASE64 is not set'); process.exit(1) }

const certPath = path.join(os.tmpdir(), 'mongodb-test-cert.pem')
fs.writeFileSync(certPath, Buffer.from(MONGODB_CERT_BASE64, 'base64').toString('utf-8'), { mode: 0o600 })

console.log('Connecting to MongoDB...')

try {
  await mongoose.connect(MONGODB_URI, {
    tlsCertificateKeyFile: certPath,
    authMechanism: 'MONGODB-X509',
    authSource: '$external',
    serverSelectionTimeoutMS: 10000,
  })
  console.log('✓ MongoDB connection successful')
  console.log('  Host:', mongoose.connection.host)
  console.log('  DB:  ', mongoose.connection.name)
} catch (err) {
  console.error('✗ Connection failed:', err.message)
  process.exit(1)
} finally {
  await mongoose.disconnect()
  fs.unlinkSync(certPath)
}
