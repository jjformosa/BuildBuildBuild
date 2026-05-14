import { MongoClient, type MongoClientOptions } from 'mongodb'
import { mongodbCertPath } from './cert'

const uri = process.env.MONGODB_URI!

function makeOptions(): MongoClientOptions {
  const certPath = mongodbCertPath()
  return certPath ? { tlsCertificateKeyFile: certPath } : {}
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, makeOptions())
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise!
} else {
  const client = new MongoClient(uri, makeOptions())
  clientPromise = client.connect()
}

export default clientPromise
