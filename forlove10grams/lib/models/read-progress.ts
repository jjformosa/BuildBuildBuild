import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IReadProgress extends Document {
  userId: Types.ObjectId
  bookId: Types.ObjectId
  pageId: Types.ObjectId
  readAt: Date
}

const ReadProgressSchema = new Schema<IReadProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
  readAt: { type: Date, default: () => new Date() },
})

ReadProgressSchema.index({ userId: 1, bookId: 1, pageId: 1 }, { unique: true })

const ReadProgress: Model<IReadProgress> =
  mongoose.models.ReadProgress ??
  mongoose.model<IReadProgress>('ReadProgress', ReadProgressSchema)

export default ReadProgress
