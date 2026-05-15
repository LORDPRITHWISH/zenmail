import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface ILabel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  color: string;
  userId: mongoose.Types.ObjectId;
}

const LabelSchema = new Schema<ILabel>({
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

LabelSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Label = models.Label || model<ILabel>('Label', LabelSchema);
