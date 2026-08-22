'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Email, IAttachment } from '@/models/Email';
import { EMAILS_PER_PAGE, escapeRegex } from '@/lib/constants';
import { resend } from '@/lib/resend';
import mongoose from 'mongoose';

/**
 * Scheduled mail lives in its own folder until its send time passes, then it
 * belongs in Sent like anything else. Resend does the actual delivery; this
 * only moves our copy. Called from the two things the client polls anyway, so
 * there is no cron to run.
 * ponytail: sweep-on-read, so a scheduled mail shows in Sent on the next poll
 * rather than the exact second. Add a cron if that lag ever matters.
 */
async function sweepDueScheduled(userId: mongoose.Types.ObjectId) {
  await Email.updateMany(
    { userId, folder: 'scheduled', scheduledAt: { $lte: new Date() } },
    { $set: { folder: 'sent' }, $unset: { scheduledAt: 1 } }
  );
}

export async function getEmails(
  folder: string,
  page: number = 1,
  search?: string,
  labelId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated', emails: [], total: 0 };
  }

  await connectDB();
  await sweepDueScheduled(new mongoose.Types.ObjectId(session.user.id));
  const skip = (page - 1) * EMAILS_PER_PAGE;


  const baseUserCondition = { userId: new mongoose.Types.ObjectId(session.user.id) };

  // Build query
  const query: Record<string, unknown> = {};

  query.userId = baseUserCondition.userId;

  if (labelId) {
    query.labels = labelId;
    query.folder = { $ne: 'trash' };
  } else if (folder === 'starred') {
    query.isStarred = true;
    query.folder = { $ne: 'trash' };
  } else {
    query.folder = folder;
  }

  if (search) {
    const safe = escapeRegex(search);
    const searchCondition = {
      $or: [
        { subject: { $regex: safe, $options: 'i' } },
        { from: { $regex: safe, $options: 'i' } },
        { to: { $regex: safe, $options: 'i' } },
        { text: { $regex: safe, $options: 'i' } },
      ]
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or }, searchCondition];
      delete query.$or;
    } else {
      query.$or = searchCondition.$or;
    }
  }

  const [emails, total] = await Promise.all([
    Email.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(EMAILS_PER_PAGE)
      .lean(),
    Email.countDocuments(query),
  ]);

  // One aggregate over just this page's threads, so the list can show "3" on a
  // conversation without loading any of the other messages.
  const threadIds = [...new Set(emails.map((e) => e.threadId).filter(Boolean))];
  const threadCounts: Record<string, number> = {};
  if (threadIds.length > 0) {
    const grouped = await Email.aggregate([
      { $match: { userId: query.userId, threadId: { $in: threadIds } } },
      { $group: { _id: '$threadId', count: { $sum: 1 } } },
    ]);
    for (const g of grouped) threadCounts[g._id as string] = g.count as number;
  }

  return {
    emails: emails.map((e) => ({
      ...e,
      id: e._id.toString(),
      threadCount: e.threadId ? threadCounts[e.threadId] ?? 1 : 1,
      scheduledAt: e.scheduledAt ? new Date(e.scheduledAt).toISOString() : null,
      _id: e._id.toString(),
      userId: e.userId?.toString() ?? null,
      attachments: (e.attachments || []).map((a: IAttachment) => ({
        ...a,
        id: a._id.toString(),
        _id: a._id.toString(),
      })),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / EMAILS_PER_PAGE),
  };
}

export async function getEmail(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await connectDB();

  
  const query: Record<string, unknown> = { _id: new mongoose.Types.ObjectId(id) };

  query.userId = new mongoose.Types.ObjectId(session.user.id);

  const email = await Email.findOne(query).lean();

  if (!email) {
    return { error: 'Email not found' };
  }

  // Mark as read
  if (!email.isRead) {
    await Email.findByIdAndUpdate(id, { isRead: true });
    email.isRead = true;
  }

  return {
    email: {
      ...email,
      id: email._id.toString(),
      _id: email._id.toString(),
      scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString() : null,
      userId: email.userId?.toString() ?? null,
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

export async function toggleStar(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const email = await Email.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(session.user.id),
  })
    .select('isStarred')
    .lean();

  if (!email) return { error: 'Email not found' };

  await Email.findByIdAndUpdate(id, { isStarred: !email.isStarred });

  return { success: true, isStarred: !email.isStarred };
}

export async function toggleRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const email = await Email.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(session.user.id),
  })
    .select('isRead')
    .lean();

  if (!email) return { error: 'Email not found' };

  await Email.findByIdAndUpdate(id, { isRead: !email.isRead });

  return { success: true, isRead: !email.isRead };
}

export async function moveToFolder(ids: string[], folder: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Email.updateMany(
    {
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      userId: new mongoose.Types.ObjectId(session.user.id),
    },
    { folder }
  );

  return { success: true };
}

export async function deleteEmails(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const userId = new mongoose.Types.ObjectId(session.user.id);

  // If already in trash, permanently delete
  const inTrash = await Email.find({
    _id: { $in: objectIds },
    userId,
    folder: 'trash',
  })
    .select('_id')
    .lean();

  const trashIds = inTrash.map((e) => e._id.toString());
  const moveIds = ids.filter((id) => !trashIds.includes(id));

  if (trashIds.length > 0) {
    await Email.deleteMany({
      _id: { $in: trashIds.map((id) => new mongoose.Types.ObjectId(id)) },
      userId,
    });
  }

  if (moveIds.length > 0) {
    await Email.updateMany(
      {
        _id: { $in: moveIds.map((id) => new mongoose.Types.ObjectId(id)) },
        userId,
      },
      { folder: 'trash' }
    );
  }

  return { success: true };
}

export async function getUnreadCounts() {
  const session = await auth();
  if (!session?.user?.id) return { counts: {} };

  await connectDB();


  const userId = new mongoose.Types.ObjectId(session.user.id);
  await sweepDueScheduled(userId);

  const folders = ['inbox', 'spam', 'trash'];
  const counts: Record<string, number> = {};

  await Promise.all(
    folders.map(async (folder) => {
      counts[folder] = await Email.countDocuments({ folder, isRead: false, userId });
    })
  );

  // Drafts and scheduled are always "read", so show how many are waiting.
  const [drafts, scheduled] = await Promise.all([
    Email.countDocuments({ userId, folder: 'drafts' }),
    Email.countDocuments({ userId, folder: 'scheduled' }),
  ]);
  counts.drafts = drafts;
  counts.scheduled = scheduled;

  // Starred count
  counts.starred = await Email.countDocuments({
    userId,
    isStarred: true,
    folder: { $ne: 'trash' },
  });

  return { counts };
}

export async function markAsRead(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Email.updateMany(
    {
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      userId: new mongoose.Types.ObjectId(session.user.id),
    },
    { isRead: true }
  );

  return { success: true };
}

export async function markAsUnread(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Email.updateMany(
    {
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      userId: new mongoose.Types.ObjectId(session.user.id),
    },
    { isRead: false }
  );

  return { success: true };
}

/**
 * Every message in one conversation, oldest first. The email view renders the
 * others collapsed above the one you opened.
 */
export async function getThread(threadId: string, excludeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { messages: [] };

  await connectDB();

  const messages = await Email.find({
    userId: new mongoose.Types.ObjectId(session.user.id),
    threadId,
    _id: { $ne: new mongoose.Types.ObjectId(excludeId) },
    folder: { $ne: 'trash' },
  })
    .select('from to subject text html createdAt folder isRead')
    .sort({ createdAt: 1 })
    .lean();

  return {
    messages: messages.map((m) => ({
      id: m._id.toString(),
      from: m.from,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
      folder: m.folder,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/**
 * Addresses this user has actually corresponded with, for compose autocomplete.
 * Derived from their own mail — no contacts table to keep in sync.
 */
export async function getContacts() {
  const session = await auth();
  if (!session?.user?.id) return { contacts: [] };

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const rows = await Email.aggregate([
    { $match: { userId } },
    { $project: { addresses: { $concatArrays: ['$to', '$cc', ['$from']] } } },
    { $unwind: '$addresses' },
    { $group: { _id: '$addresses', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 200 },
  ]);

  const seen = new Set<string>();
  const contacts: string[] = [];
  for (const row of rows) {
    const address = String(row._id).match(/<(.+?)>/)?.[1] ?? String(row._id);
    const normalised = address.trim().toLowerCase();
    if (!normalised.includes('@') || seen.has(normalised)) continue;
    seen.add(normalised);
    contacts.push(normalised);
  }

  return { contacts };
}

/**
 * Pull a scheduled email back before it goes out. Resend holds it until its
 * send time, so cancelling there is what actually stops delivery; the local
 * copy becomes a draft so the text isn't lost.
 */
export async function cancelScheduled(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const email = await Email.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(session.user.id),
    folder: 'scheduled',
  })
    .select('messageId scheduledAt')
    .lean();

  if (!email) return { error: 'Not a scheduled email' };

  if (email.scheduledAt && new Date(email.scheduledAt) <= new Date()) {
    return { error: 'That email has already been sent' };
  }

  if (email.messageId) {
    const { error } = await resend.emails.cancel(email.messageId);
    if (error) return { error: error.message };
  }

  await Email.findByIdAndUpdate(id, {
    $set: { folder: 'drafts' },
    $unset: { scheduledAt: 1, messageId: 1 },
  });

  return { success: true };
}

/** Empty the trash in one go, instead of selecting 50 at a time. */
export async function emptyTrash() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  const result = await Email.deleteMany({
    userId: new mongoose.Types.ObjectId(session.user.id),
    folder: 'trash',
  });

  return { success: true, deleted: result.deletedCount ?? 0 };
}

/** Mark everything in a folder read — the "clear the badge" button. */
export async function markFolderRead(folder: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Email.updateMany(
    { userId: new mongoose.Types.ObjectId(session.user.id), folder, isRead: false },
    { isRead: true }
  );

  return { success: true };
}
