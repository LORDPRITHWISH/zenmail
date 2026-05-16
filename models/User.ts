import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  role: string;
  monitoredEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: null },
    role: { type: String, default: 'user' },
    monitoredEmails: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>('User', UserSchema);
