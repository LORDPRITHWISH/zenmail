'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';
import { resend, RESEND_DOMAIN } from '@/lib/resend';
import { MAX_ATTACHMENT_SIZE } from '@/lib/constants';
import { htmlToText } from '@/lib/utils';
import mongoose from 'mongoose';

interface SendEmailInput {
  id?: string; // set when this started life as a draft
  from?: string; // Admin only - custom from address
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
  threadId?: string;
  scheduledAt?: string; // ISO 8601; Resend holds delivery until then
  attachments?: {
    filename: string;
    content: string; // base64
    contentType: string;
    size: number;
  }[];
}

function totalAttachmentSize(input: SendEmailInput): number {
  return (input.attachments ?? []).reduce((sum, att) => sum + att.size, 0);
}

/**
 * The client checks size too, but a server action is a public endpoint — an
 * oversized payload here would blow the 16MB Mongo document limit at write
 * time, after the mail had already gone out.
 */
function tooLarge(input: SendEmailInput): string | null {
  const total = totalAttachmentSize(input);
  if (total > MAX_ATTACHMENT_SIZE) {
    return `Attachments total ${(total / 1024 / 1024).toFixed(1)}MB, over the ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB limit.`;
  }
  return null;
}

async function senderFor(userId: string) {
  const user = await User.findById(userId).select('email name role').lean();
  if (!user) return null;
  return user as { email: string; name?: string | null; role?: string };
}

function defaultFromAddress(user: { email: string; name?: string | null }) {
  const username = user.email.split('@')[0];
  return `${user.name || username} <${username}@${RESEND_DOMAIN}>`;
}

export async function sendEmail(input: SendEmailInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (input.to.length === 0) {
    return { error: 'Add at least one recipient.' };
  }

  const oversize = tooLarge(input);
  if (oversize) return { error: oversize };

  await connectDB();

  const u = await senderFor(session.user.id);
  if (!u) return { error: 'User not found' };

  const fromAddress =
    input.from && u.role === 'admin' ? input.from : defaultFromAddress(u);

  // A send time in the past is just an immediate send.
  const scheduledAt =
    input.scheduledAt && new Date(input.scheduledAt) > new Date()
      ? new Date(input.scheduledAt)
      : null;

  // A message that is HTML-only, or carries an empty text/plain part, reads as
  // bulk mail to every filter worth the name. Always ship a real alternative.
  const text = input.text?.trim() || htmlToText(input.html);

  // Threading headers must carry a real RFC 5322 Message-ID. Ours for inbound
  // mail is an internal `<resendId>-uid-<userId>` key, and a malformed
  // In-Reply-To looks like forged mail — so only pass one through when it
  // actually is a Message-ID. References repeats it so the reply threads.
  const parentMessageId = /^<[^\s@]+@[^\s@]+>$/.test(input.inReplyTo ?? '')
    ? input.inReplyTo
    : null;

  try {
    const resendAttachments = input.attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
    }));

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject,
      html: input.html,
      text,
      replyTo: input.replyTo || u.email,
      headers: parentMessageId
        ? { 'In-Reply-To': parentMessageId, References: parentMessageId }
        : undefined,
      attachments: resendAttachments,
      ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
    });

    if (error) {
      return { error: error.message };
    }

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Handed off to Resend — the draft it came from has served its purpose.
    if (input.id) {
      await Email.deleteOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId,
        folder: 'drafts',
      });
    }

    const email = await Email.create({
      messageId: data?.id,
      from: fromAddress,
      to: input.to,
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject,
      html: input.html,
      text,
      replyTo: input.replyTo || u.email,
      folder: scheduledAt ? 'scheduled' : 'sent',
      scheduledAt,
      isRead: true,
      inReplyTo: input.inReplyTo,
      threadId: input.threadId,
      userId,
      attachments:
        input.attachments?.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          content: att.content,
        })) || [],
    });

    return {
      success: true,
      emailId: email._id.toString(),
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { error: 'Failed to send email. Please try again.' };
  }
}

/**
 * Save or update a draft. Passing the id of an existing draft edits it in
 * place — without that, every autosave used to leave another copy behind.
 */
export async function saveDraft(input: SendEmailInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const oversize = tooLarge(input);
  if (oversize) return { error: oversize };

  await connectDB();

  const u = await senderFor(session.user.id);
  if (!u) return { error: 'User not found' };

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const fromAddress = input.from || defaultFromAddress(u);

  const fields = {
    from: fromAddress,
    to: input.to,
    cc: input.cc || [],
    bcc: input.bcc || [],
    subject: input.subject,
    html: input.html,
    text: input.text || '',
    folder: 'drafts',
    isRead: true,
    inReplyTo: input.inReplyTo,
    threadId: input.threadId,
    userId,
    attachments:
      input.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
      })) || [],
  };

  try {
    if (input.id) {
      const updated = await Email.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(input.id), userId, folder: 'drafts' },
        { $set: fields },
        { new: true }
      );
      if (updated) return { success: true, emailId: updated._id.toString() };
      // Draft vanished (sent or deleted in another tab) — fall through to create.
    }

    const email = await Email.create(fields);
    return { success: true, emailId: email._id.toString() };
  } catch (err) {
    console.error('Failed to save draft:', err);
    return { error: 'Failed to save draft.' };
  }
}

/** Discard a draft outright — the trash button in the compose window. */
export async function discardDraft(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await connectDB();

  await Email.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(session.user.id),
    folder: 'drafts',
  });

  return { success: true };
}
