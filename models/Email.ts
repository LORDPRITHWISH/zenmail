import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAttachment {
  _id: mongoose.Types.ObjectId;
  filename: string;
  contentType: string;
  size: number;
  content?: string; // base64
  url?: string;
}

export interface IEmail extends Document {
  _id: mongoose.Types.ObjectId;
  messageId?: string;

  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;

  subject: string;
  html?: string;
  text?: string;

  folder: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];

  // Threading
  inReplyTo?: string;
  threadId?: string;
  references: string[];

  // Ownership
  userId: mongoose.Types.ObjectId;

  attachments: IAttachment[];

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  content: { type: String },
  url: { type: String },
});

const EmailSchema = new Schema<IEmail>(
  {
    messageId: { type: String, sparse: true, unique: true },

    from: { type: String, required: true },
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: { type: String },

    subject: { type: String, default: '(No Subject)' },
    html: { type: String },
    text: { type: String },

    folder: { type: String, default: 'inbox' },
    isRead: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    labels: { type: [String], default: [] },

    inReplyTo: { type: String },
    threadId: { type: String },
    references: { type: [String], default: [] },

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    attachments: { type: [AttachmentSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
EmailSchema.index({ userId: 1, folder: 1 });
EmailSchema.index({ userId: 1, isRead: 1 });
EmailSchema.index({ threadId: 1 });

export const Email = models.Email || model<IEmail>('Email', EmailSchema);
