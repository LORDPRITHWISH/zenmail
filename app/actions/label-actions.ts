'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Label } from '@/models/Label';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

export async function getLabels() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated', labels: [] };

  await connectDB();

  const labels = await Label.find({ userId: session.user.id })
    .sort({ name: 1 })
    .lean();

  return {
    labels: labels.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      color: l.color,
    })),
  };
}

export async function createLabel(name: string, color: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Name required' };

  await connectDB();

  try {
    const label = await Label.create({
      name: trimmed,
      color,
      userId: session.user.id,
    });
    return { label: { id: label._id.toString(), name: label.name, color: label.color } };
  } catch {
    return { error: 'A label with that name already exists' };
  }
}

export async function deleteLabel(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  await Label.deleteOne({ _id: id, userId });
  await Email.updateMany({ userId, labels: id }, { $pull: { labels: id } });

  return { success: true };
}

export async function toggleEmailLabel(emailId: string, labelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const email = await Email.findOne({
    _id: emailId,
    userId: new mongoose.Types.ObjectId(session.user.id),
  })
    .select('labels')
    .lean();

  if (!email) return { error: 'Email not found' };

  const hasLabel = email.labels.includes(labelId);
  await Email.findByIdAndUpdate(emailId,
    hasLabel ? { $pull: { labels: labelId } } : { $addToSet: { labels: labelId } }
  );

  return { success: true, added: !hasLabel };
}
