import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IShare extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  active: boolean
}

const ShareSchema = new Schema<IShare>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ShareSchema.index({ bookId: 1 })

const Share: Model<IShare> =
  mongoose.models.Share ?? mongoose.model<IShare>('Share', ShareSchema)

export default Share
