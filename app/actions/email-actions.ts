'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Email, IAttachment } from '@/models/Email';
import { User } from '@/models/User';
import { EMAILS_PER_PAGE } from '@/lib/constants';
import mongoose from 'mongoose';

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
  const skip = (page - 1) * EMAILS_PER_PAGE;


  const baseUserCondition = { userId: new mongoose.Types.ObjectId(session.user.id) };

  // Build query
  const query: Record<string, any> = {};

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
    const searchCondition = {
      $or: [
        { subject: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { text: { $regex: search, $options: 'i' } },
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

  return {
    emails: emails.map((e) => ({
      ...e,
      id: e._id.toString(),
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

  
  const query: any = { _id: new mongoose.Types.ObjectId(id) };

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
  const folders = ['inbox', 'sent', 'drafts', 'spam', 'trash'];
  const counts: Record<string, number> = {};

  await Promise.all(
    folders.map(async (folder) => {
      let query: any = { folder, isRead: false, userId };
      
      counts[folder] = await Email.countDocuments(query);
    })
  );

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
