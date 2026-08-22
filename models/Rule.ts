import mongoose, { Schema, model, models, Document } from 'mongoose';
import { RULE_FIELDS, RULE_ACTIONS, RuleField, RuleAction } from '@/lib/constants';

export interface IRule extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  field: RuleField;
  contains: string;
  action: RuleAction;
  labelId?: string | null; // only used when action === 'label'
  createdAt: Date;
}

const RuleSchema = new Schema<IRule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    field: { type: String, enum: RULE_FIELDS, required: true },
    contains: { type: String, required: true },
    action: { type: String, enum: RULE_ACTIONS, required: true },
    labelId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RuleSchema.index({ userId: 1 });

export const Rule = models.Rule || model<IRule>('Rule', RuleSchema);
