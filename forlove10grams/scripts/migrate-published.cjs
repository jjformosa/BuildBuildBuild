// forlove10grams/scripts/migrate-published.cjs
// DEPLOYMENT ORDER: run this script BEFORE switching traffic to code that uses shareStatus.
// Deploying first will make all previously-published books return 403 to readers.
// Idempotent — safe to re-run.
const mongoose = require('mongoose')

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI env var is required')

  await mongoose.connect(uri)

  const col = mongoose.connection.collection('books')

  const shared = await col.updateMany(
    { published: true, shareStatus: { $exists: false } },
    { $set: { shareStatus: 'shared' }, $unset: { published: '' } }
  )
  const priv = await col.updateMany(
    { published: { $ne: true }, shareStatus: { $exists: false } },
    { $set: { shareStatus: 'private' }, $unset: { published: '' } }
  )

  console.log(`Migrated: ${shared.modifiedCount} → shared, ${priv.modifiedCount} → private`)
  await mongoose.disconnect()
}

migrate().catch((err) => { console.error(err); process.exit(1) })
