import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
}

const PageSchema = new Schema<IPage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    type: { type: String, enum: ['carousel', 'video'], required: true },
    content: String,
    mediaUrls: [{ type: String }],
  },
  { timestamps: true }
)

PageSchema.index({ bookId: 1 })

const Page: Model<IPage> =
  mongoose.models.Page ?? mongoose.model<IPage>('Page', PageSchema)

export default Page
