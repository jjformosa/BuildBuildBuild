import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface ICollection extends Document {
  name: string
  ownerId: Types.ObjectId
  bookIds: Types.ObjectId[] // ordered: array order is display order
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookIds: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
  },
  { timestamps: true }
)

CollectionSchema.index({ ownerId: 1, name: 1 }, { unique: true }) // same owner, no dup names
CollectionSchema.index({ bookIds: 1 }) // reverse lookup: which folders contain this book

const Collection: Model<ICollection> =
  mongoose.models.Collection ?? mongoose.model<ICollection>('Collection', CollectionSchema)

export default Collection
