'use strict'
const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const os = require('os')
const path = require('path')

async function main() {
  // Write X.509 cert to temp file
  const b64 = process.env.MONGODB_CERT_BASE64
  if (!b64) throw new Error('MONGODB_CERT_BASE64 not set')
  const certPath = path.join(os.tmpdir(), 'mongo-cert-seed.pem')
  fs.writeFileSync(certPath, Buffer.from(b64, 'base64'), { mode: 0o600 })

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  const client = new MongoClient(uri, { tlsCertificateKeyFile: certPath })
  await client.connect()
  console.log('Connected to MongoDB')

  // NextAuth MongoDB adapter uses the default db (no explicit name in URI → Atlas default)
  const db = client.db()
  console.log('Database:', db.databaseName)

  // ── 1. Find target user ───────────────────────────────────────────────────
  const targetId = process.env.SEED_USER_ID
    ? new ObjectId(process.env.SEED_USER_ID)
    : null
  const user = targetId
    ? await db.collection('users').findOne({ _id: targetId })
    : await db.collection('users').findOne({})
  if (!user) {
    console.error('No user found in users collection')
    await client.close()
    return
  }
  console.log(`\nTarget user: ${user.email} [${user._id}]`)

  // ── 2. Guard: skip if seed books already exist ────────────────────────────
  const existing = await db.collection('books').countDocuments({
    title: { $in: ['她留下的十克拉回憶', '秘密花園', '我們的第一次旅行'] },
  })
  if (existing > 0) {
    console.log('\nSeed books already exist, skipping.')
    await client.close()
    return
  }

  // Phantom owner (not a real user, just an ObjectId for ownership reference)
  const phantomId = new ObjectId()

  // ── Book A: current user = editor ────────────────────────────────────────
  const bookAId = new ObjectId()
  const pagesA = [
    {
      _id: new ObjectId(),
      bookId: bookAId,
      type: 'carousel',
      content: '第一次見面，陽光灑在咖啡廳的角落，你說喝拿鐵還是美式。',
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      bookId: bookAId,
      type: 'video',
      content: '那段短片，你說「拍起來太醜了」，但我覺得剛剛好。',
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]
  const bookA = {
    _id: bookAId,
    title: '她留下的十克拉回憶',
    description: '由另一位帳號建立，邀請你擔任編輯者（可進入 edit 頁面）',
    createdBy: phantomId,
    editorId: user._id,
    pageOrder: pagesA.map((p) => p._id),
    shareStatus: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // ── Book B: current user = reader only (no edit access) ───────────────────
  const bookBId = new ObjectId()
  const bookB = {
    _id: bookBId,
    title: '秘密花園',
    description: '你只有閱讀權限（Phase 3 share token 流程）',
    createdBy: phantomId,
    pageOrder: [],
    shareStatus: 'shared',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // ── Book C: current user = owner (shows up in Dashboard) ─────────────────
  const bookCId = new ObjectId()
  const pagesC = [
    {
      _id: new ObjectId(),
      bookId: bookCId,
      type: 'carousel',
      content: '京都的清晨，人很少，你說這才是旅行的感覺。',
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]
  const bookC = {
    _id: bookCId,
    title: '我們的第一次旅行',
    description: '你擁有此書，出現在 Dashboard 書單',
    createdBy: user._id,
    pageOrder: pagesC.map((p) => p._id),
    shareStatus: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  await db.collection('books').insertMany([bookA, bookB, bookC])
  await db.collection('pages').insertMany([...pagesA, ...pagesC])

  console.log('\nSeeded:')
  console.log(`  [editor]  Book A: "${bookA.title}" [${bookA._id}]  pages: ${pagesA.length}`)
  console.log(`  [reader]  Book B: "${bookB.title}" [${bookB._id}]  pages: 0`)
  console.log(`  [owner]   Book C: "${bookC.title}" [${bookC._id}]  pages: ${pagesC.length}`)
  console.log(`\nPhantom owner ID: ${phantomId} (not a real user)`)

  await client.close()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
