import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ITag extends Document {
  name: string
  authorId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

const Tag: Model<ITag> =
  mongoose.models.Tag ?? mongoose.model<ITag>('Tag', TagSchema)

export default Tag
