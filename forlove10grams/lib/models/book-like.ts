import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookLike extends Document {
  bookId: Types.ObjectId
  userId: Types.ObjectId
  likedAt: Date
}

const BookLikeSchema = new Schema<IBookLike>({
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  likedAt: { type: Date, default: () => new Date() },
})

BookLikeSchema.index({ bookId: 1, userId: 1 }, { unique: true })

const BookLike: Model<IBookLike> =
  mongoose.models.BookLike ?? mongoose.model<IBookLike>('BookLike', BookLikeSchema)

export default BookLike
