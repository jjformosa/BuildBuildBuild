import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookInvite extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  expiresAt: Date
  revokedAt?: Date
}

const BookInviteSchema = new Schema<IBookInvite>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
)

BookInviteSchema.index({ bookId: 1 })

const BookInvite: Model<IBookInvite> =
  mongoose.models.BookInvite ?? mongoose.model<IBookInvite>('BookInvite', BookInviteSchema)

export default BookInvite
