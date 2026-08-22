'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email, IAttachment } from '@/models/Email';
import mongoose from 'mongoose';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  await connectDB();
  const user = await User.findById(session.user.id).select('role').lean();
  if ((user as { role?: string } | null)?.role !== 'admin')
    throw new Error('Not authorized');

  return session;
}

export async function adminGetAllEmails(
  page: number = 1,
  filters?: {
    folder?: string;
    search?: string;
    from?: string;
    to?: string;
    hasAttachments?: boolean;
    isRead?: boolean;
  }
) {
  await requireAdmin();
  await connectDB();

  const perPage = 50;
  const skip = (page - 1) * perPage;

  const query: Record<string, unknown> = {};

  if (filters?.folder) query.folder = filters.folder;
  if (filters?.isRead !== undefined) query.isRead = filters.isRead;

  if (filters?.search) {
    query.$or = [
      { subject: { $regex: filters.search, $options: 'i' } },
      { from: { $regex: filters.search, $options: 'i' } },
      { text: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters?.from) {
    query.from = { $regex: filters.from, $options: 'i' };
  }

  if (filters?.to) {
    query.to = filters.to; // exact match in array
  }

  if (filters?.hasAttachments) {
    query['attachments.0'] = { $exists: true };
  }

  const [emails, total] = await Promise.all([
    Email.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('userId', 'name email image')
      .lean(),
    Email.countDocuments(query),
  ]);

  return {
    emails: emails.map((e) => {
      const populated = e as typeof e & {
        userId: { _id: mongoose.Types.ObjectId; name?: string; email?: string; image?: string };
      };
      return {
        ...e,
        id: e._id.toString(),
        _id: e._id.toString(),
        userId: populated.userId?._id?.toString() ?? e.userId?.toString() ?? null,
        user: populated.userId
          ? {
              name: populated.userId.name ?? null,
              email: populated.userId.email ?? null,
              image: populated.userId.image ?? null,
            }
          : undefined,
        attachments: (e.attachments || []).map((a: IAttachment) => ({
          ...a,
          id: a._id.toString(),
          _id: a._id.toString(),
        })),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    }),
    total,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function adminGetEmail(id: string) {
  await requireAdmin();
  await connectDB();

  const email = await Email.findById(id).populate('userId', 'name email image').lean();

  if (!email) {
    return { error: 'Email not found' };
  }

  const populated = email as typeof email & {
    userId: { _id: mongoose.Types.ObjectId; name?: string; email?: string; image?: string };
  };

  return {
    email: {
      ...email,
      id: email._id.toString(),
      _id: email._id.toString(),
      userId: populated.userId?._id?.toString() ?? email.userId?.toString() ?? null,
      user: populated.userId
        ? {
            name: populated.userId.name ?? null,
            email: populated.userId.email ?? null,
            image: populated.userId.image ?? null,
          }
        : undefined,
      attachments: (email.attachments || []).map((a: IAttachment) => ({
        ...a,
        id: a._id.toString(),
        _id: a._id.toString(),
      })),
      createdAt: email.createdAt.toISOString(),
      updatedAt: email.updatedAt.toISOString(),
    },
  };
}

export async function adminGetStats() {
  await requireAdmin();
  await connectDB();

  const [totalEmails, totalUsers, totalSent, totalReceived, totalUnread] =
    await Promise.all([
      Email.countDocuments(),
      User.countDocuments({ isPlaceholder: { $ne: true } }),
      Email.countDocuments({ folder: 'sent' }),
      Email.countDocuments({ folder: 'inbox' }),
      Email.countDocuments({ folder: 'inbox', isRead: false }),
    ]);

  return { totalEmails, totalUsers, totalSent, totalReceived, totalUnread };
}

export async function adminGetUsers() {
  await requireAdmin();
  await connectDB();

  // Exclude placeholder (pre-created) users — they aren't real accounts yet
  const users = await User.find({ isPlaceholder: { $ne: true } }).sort({ createdAt: -1 }).lean();

  // Get email counts per user
  const emailCounts = await Email.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(
    emailCounts.map((e) => [e._id ? e._id.toString() : 'unassigned', e.count as number])
  );

  return users.map((u) => ({
    ...u,
    id: u._id.toString(),
    _id: u._id.toString(),
    _count: { emails: countMap.get(u._id.toString()) ?? 0 },
    isSuperAdmin: u.email === process.env.ADMIN_EMAIL,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function adminSetUserRole(userId: string, role: 'user' | 'admin') {
  await requireAdmin();
  await connectDB();

  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) throw new Error('User not found');

  if (userToUpdate.email === process.env.ADMIN_EMAIL && role !== 'admin') {
    throw new Error('The superadmin cannot be demoted.');
  }

  userToUpdate.role = role;
  await userToUpdate.save();

  return { success: true };
}

export async function adminGetInboxes() {
  const session = await requireAdmin();
  await connectDB();

  const user = await User.findById(session.user.id).select('monitoredEmails').lean();
  const monitoredEmails = (user as { monitoredEmails?: string[] })?.monitoredEmails || [];

  const inboxes = await Email.aggregate([
    { $unwind: "$to" },
    {
      $group: {
        _id: "$to",
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
        },
        lastEmail: { $max: "$createdAt" },
      },
    },
    { $sort: { lastEmail: -1 } },
  ]);

  return inboxes.map((i) => ({
    email: i._id as string,
    count: i.count as number,
    unreadCount: i.unreadCount as number,
    lastEmail: (i.lastEmail as Date).toISOString(),
    isMonitored: monitoredEmails.includes(i._id as string),
  }));
}

export async function adminToggleMonitorInbox(email: string) {
  const session = await requireAdmin();
  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) throw new Error('User not found');

  const emails = user.monitoredEmails || [];
  const isMonitored = emails.includes(email);

  if (isMonitored) {
    user.monitoredEmails = emails.filter((e: string) => e !== email);
  } else {
    user.monitoredEmails = [...emails, email];
  }
  
  await user.save();
  return { success: true, isMonitored: !isMonitored };
}
