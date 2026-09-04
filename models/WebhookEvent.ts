import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId;
  type: string;
  emailId?: string;
  status: 'ok' | 'failed';
  detail: string;
  createdAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    type: { type: String, required: true },
    emailId: { type: String },
    status: { type: String, required: true },
    detail: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One row per inbound email adds up, so let Mongo expire them instead of
// writing a cleanup job.
WebhookEventSchema.index({ createdAt: -1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
WebhookEventSchema.index({ status: 1, createdAt: -1 });

export const WebhookEvent =
  models.WebhookEvent || model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
