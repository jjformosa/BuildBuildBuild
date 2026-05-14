import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface IUser extends Document {
  name?: string
  email?: string
  emailVerified?: Date
  image?: string
  role: 'admin' | 'customer'
  tenantId?: string
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: { type: String, sparse: true, unique: true },
    emailVerified: Date,
    image: String,
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    tenantId: String,
  },
  { timestamps: true }
)

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)

export default User
