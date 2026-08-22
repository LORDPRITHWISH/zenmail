'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Rule, IRule } from '@/models/Rule';
import { RULE_FIELDS, RULE_ACTIONS, RuleField, RuleAction } from '@/lib/constants';
import mongoose from 'mongoose';

export async function getSettings() {
  const session = await auth();
  if (!session?.user?.id) return { signature: '', rules: [] };

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const [user, rules] = await Promise.all([
    User.findById(userId).select('signature').lean(),
    Rule.find({ userId }).sort({ createdAt: 1 }).lean(),
  ]);

  return {
    signature: (user as { signature?: string } | null)?.signature ?? '',
    rules: (rules as IRule[]).map((r) => ({
      id: r._id.toString(),
      field: r.field,
      contains: r.contains,
      action: r.action,
      labelId: r.labelId ?? null,
    })),
  };
}

export async function saveSignature(signature: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  // A signature is rendered as HTML in the composer, so cap it rather than
  // letting an unbounded blob ride along on every message.
  if (signature.length > 10_000) return { error: 'Signature is too long.' };

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { $set: { signature } });

  return { success: true };
}

export async function createRule(input: {
  field: string;
  contains: string;
  action: string;
  labelId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const contains = input.contains.trim();
  if (!contains) return { error: 'Enter some text to match on.' };
  if (!RULE_FIELDS.includes(input.field as RuleField)) return { error: 'Unknown field' };
  if (!RULE_ACTIONS.includes(input.action as RuleAction)) return { error: 'Unknown action' };
  if (input.action === 'label' && !input.labelId) return { error: 'Pick a label to apply.' };

  await connectDB();

  const rule = await Rule.create({
    userId: new mongoose.Types.ObjectId(session.user.id),
    field: input.field,
    contains,
    action: input.action,
    labelId: input.action === 'label' ? input.labelId : null,
  });

  return {
    rule: {
      id: rule._id.toString(),
      field: rule.field,
      contains: rule.contains,
      action: rule.action,
      labelId: rule.labelId ?? null,
    },
  };
}

export async function deleteRule(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Rule.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(session.user.id),
  });

  return { success: true };
}
