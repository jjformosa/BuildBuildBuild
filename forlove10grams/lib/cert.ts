import fs from 'fs'
import os from 'os'
import path from 'path'

let _certPath: string | undefined

export function mongodbCertPath(): string | undefined {
  if (_certPath) return _certPath
  const b64 = process.env.MONGODB_CERT_BASE64
  if (!b64) return undefined
  const p = path.join(os.tmpdir(), 'mongo-cert.pem')
  fs.writeFileSync(p, Buffer.from(b64, 'base64'), { mode: 0o600 })
  _certPath = p
  return p
}
