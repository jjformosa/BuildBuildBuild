import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type TranscodingStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
}

const PageSchema = new Schema<IPage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    type: { type: String, enum: ['carousel', 'video'], required: true },
    content: String,
    mediaUrls: [{ type: String }],
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
    happenedAt: { type: Date },
  },
  { timestamps: true }
)

PageSchema.index({ bookId: 1 })

const Page: Model<IPage> =
  mongoose.models.Page ?? mongoose.model<IPage>('Page', PageSchema)

export default Page
