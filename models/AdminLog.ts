import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAdminLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: 'delete_email' | 'purge_inbox';
  target: string;
  meta: string;
  performedByEmail: string;
  performedByName?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    action: { type: String, required: true },
    target: { type: String, required: true },
    meta: { type: String, default: '' },
    performedByEmail: { type: String, required: true },
    performedByName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminLog = models.AdminLog || model<IAdminLog>('AdminLog', AdminLogSchema);
