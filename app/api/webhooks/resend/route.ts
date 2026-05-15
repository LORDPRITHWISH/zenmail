import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const body = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as Record<string, unknown>;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventType = event.type as string;
  const data = event.data as Record<string, unknown>;

  try {
    await connectDB();

    if (eventType === 'email.received') {
      await handleInboundEmail(data);
    } else if (eventType === 'email.sent') {
      const messageId = data.email_id as string;
      if (messageId) {
        // No-op update to match previous behaviour (delivery status hook)
        await Email.updateMany({ messageId }, {});
      }
    } else if (eventType === 'email.bounced') {
      console.warn('Email bounced:', data.email_id);
    }
  } catch (err) {
    console.error(`Error handling ${eventType}:`, err);
    // Still return 200 to prevent Resend from retrying
  }

  return NextResponse.json({ received: true });
}

async function handleInboundEmail(data: Record<string, unknown>) {
  const from = data.from as string;
  const to = (data.to as string[]) || [];
  const cc = (data.cc as string[]) || [];
  const subject = (data.subject as string) || '(No Subject)';
  const html = data.html as string | undefined;
  const text = data.text as string | undefined;
  const messageId = data.email_id as string;
  const inReplyTo = data.in_reply_to as string | undefined;
  const references = (data.references as string[]) || [];

  const allRecipients = [...to, ...cc];

  // Find admin users (they see everything)
  const adminUsers = await User.find({ role: 'admin' }).select('_id email').lean();

  // Find matching recipient users
  const recipientEmails = allRecipients.map(extractEmail);
  const recipientUsers = await User.find({
    email: { $in: recipientEmails.map((e) => new RegExp(`^${escapeRegex(e)}$`, 'i')) },
  })
    .select('_id email')
    .lean();

  // Combine unique user IDs
  const userIds = new Set<string>();
  recipientUsers.forEach((u) => userIds.add(u._id.toString()));
  adminUsers.forEach((u) => userIds.add(u._id.toString()));

  if (userIds.size === 0) {
    console.log('No matching users for inbound email from:', from);
    return;
  }

  const threadId = inReplyTo || messageId;

  const createPromises = Array.from(userIds).map((userId) =>
    Email.create({
      messageId: `${messageId}-${userId}`,
      from,
      to,
      cc,
      subject,
      html,
      text,
      folder: 'inbox',
      isRead: false,
      inReplyTo,
      threadId,
      references,
      userId: new mongoose.Types.ObjectId(userId),
    })
  );

  await Promise.all(createPromises);
  console.log(`Delivered inbound email to ${userIds.size} users`);
}

function extractEmail(input: string): string {
  const match = input.match(/<(.+?)>/);
  return match ? match[1] : input.trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
