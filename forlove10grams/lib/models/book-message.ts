import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookMessage extends Document {
  bookId: Types.ObjectId
  fromUserId: Types.ObjectId
  body: string // 1–500 chars
  readByCreatorAt?: Date | null // null = creator hasn't seen it
  readByEditorAt?: Date | null // null = editor hasn't seen it
  createdAt: Date
  updatedAt: Date
}

const BookMessageSchema = new Schema<IBookMessage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    readByCreatorAt: { type: Date, default: null },
    readByEditorAt: { type: Date, default: null },
  },
  { timestamps: true }
)

BookMessageSchema.index({ bookId: 1, fromUserId: 1 }, { unique: true }) // one message per reader per book
BookMessageSchema.index({ bookId: 1 })

const BookMessage: Model<IBookMessage> =
  mongoose.models.BookMessage ?? mongoose.model<IBookMessage>('BookMessage', BookMessageSchema)

export default BookMessage
