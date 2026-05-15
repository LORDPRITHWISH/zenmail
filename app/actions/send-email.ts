'use server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';
import { resend, RESEND_DOMAIN } from '@/lib/resend';
import mongoose from 'mongoose';

interface SendEmailInput {
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
  attachments?: {
    filename: string;
    content: string; // base64
    contentType: string;
    size: number;
  }[];
}

export async function sendEmail(input: SendEmailInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('email name role')
    .lean();

  if (!user) {
    return { error: 'User not found' };
  }

  const u = user as { email: string; name?: string | null; role?: string };

  // Determine the "from" address
  let fromAddress: string;

  if (input.from && u.role === 'admin') {
    fromAddress = input.from;
  } else {
    const username = u.email.split('@')[0];
    fromAddress = `${u.name || username} <${username}@${RESEND_DOMAIN}>`;
  }

  try {
    // Prepare attachments for Resend
    const resendAttachments = input.attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
    }));

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject,
      html: input.html,
      text: input.text || '',
      replyTo: input.replyTo || u.email,
      headers: input.inReplyTo
        ? { 'In-Reply-To': input.inReplyTo }
        : undefined,
      attachments: resendAttachments,
    });

    if (error) {
      return { error: error.message };
    }

    // Save to DB as sent email
    const email = await Email.create({
      messageId: data?.id,
      from: fromAddress,
      to: input.to,
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject,
      html: input.html,
      text: input.text || '',
      replyTo: input.replyTo || u.email,
      folder: 'sent',
      isRead: true,
      inReplyTo: input.inReplyTo,
      threadId: input.threadId,
      userId: new mongoose.Types.ObjectId(session.user.id),
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
      })) || [],
    });

    return { success: true, emailId: email._id.toString() };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { error: 'Failed to send email. Please try again.' };
  }
}

export async function saveDraft(input: SendEmailInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('email name role')
    .lean();

  if (!user) {
    return { error: 'User not found' };
  }

  const u = user as { email: string; name?: string | null };
  const username = u.email.split('@')[0];
  const fromAddress =
    input.from || `${u.name || username} <${username}@${RESEND_DOMAIN}>`;

  try {
    const email = await Email.create({
      from: fromAddress,
      to: input.to,
      cc: input.cc || [],
      bcc: input.bcc || [],
      subject: input.subject,
      html: input.html,
      text: input.text || '',
      folder: 'drafts',
      isRead: true,
      userId: new mongoose.Types.ObjectId(session.user.id),
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
      })) || [],
    });

    return { success: true, emailId: email._id.toString() };
  } catch (err) {
    console.error('Failed to save draft:', err);
    return { error: 'Failed to save draft.' };
  }
}
