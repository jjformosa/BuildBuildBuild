import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookReader extends Document {
  bookId: Types.ObjectId
  userId: Types.ObjectId
  joinedAt: Date
}

const BookReaderSchema = new Schema<IBookReader>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
)

BookReaderSchema.index({ bookId: 1, userId: 1 }, { unique: true })
BookReaderSchema.index({ bookId: 1 })

const BookReader: Model<IBookReader> =
  mongoose.models.BookReader ?? mongoose.model<IBookReader>('BookReader', BookReaderSchema)

export default BookReader
