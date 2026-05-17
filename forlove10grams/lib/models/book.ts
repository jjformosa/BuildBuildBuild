import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBook extends Document {
  title: string
  description?: string
  coverImage?: string
  createdBy: Types.ObjectId
  editorId?: Types.ObjectId
  pageOrder: Types.ObjectId[]
  published: boolean
  tags: string[]
}

const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    description: String,
    coverImage: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    pageOrder: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    published: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true }
)

BookSchema.index({ createdBy: 1 })
BookSchema.index({ editorId: 1 })

const Book: Model<IBook> =
  mongoose.models.Book ?? mongoose.model<IBook>('Book', BookSchema)

export default Book
