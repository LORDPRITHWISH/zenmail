import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Resend sends: { type: "email.received", created_at: "...", data: { email_id, from, to, ... } }
  const eventType = (body.type as string) || 'email.received';
  const data = (body.data as Record<string, unknown>) ?? body;

  try {
    await connectDB();

    if (eventType === 'email.received') {
      await handleInboundEmail(data);
    } else if (eventType === 'email.bounced') {
      console.warn('Email bounced:', data.email_id);
    }
    // Ignore email.sent — we track those ourselves
  } catch (err) {
    console.error(`Error handling ${eventType}:`, err);
    // Always return 200 to prevent Resend from retrying indefinitely
  }

  return NextResponse.json({ received: true });
}

async function handleInboundEmail(webhookData: Record<string, unknown>) {
  const emailId = webhookData.email_id as string;

  if (!emailId) {
    console.error('Inbound webhook missing email_id', webhookData);
    return;
  }

  // ── Fetch full email content from Resend API ──────────────────────────────
  // The webhook only contains metadata. Body (html/text) must be fetched separately.
  const { data: full, error } = await resend.emails.receiving.get(emailId);

  if (error || !full) {
    console.error('Failed to retrieve full email content for', emailId, error);
    // Fall back to webhook metadata so we at least store something
  }

  const from = (full?.from ?? webhookData.from) as string;
  const to = ((full?.to ?? webhookData.to) as string[]) || [];
  const cc = ((full?.cc ?? webhookData.cc) as string[]) || [];
  const subject = ((full?.subject ?? webhookData.subject) as string) || '(No Subject)';
  const html = full?.html as string | undefined;
  const text = full?.text as string | undefined;
  const inReplyTo = webhookData.in_reply_to as string | undefined;
  const references = (webhookData.references as string[]) || [];

  // Use the Resend message_id (SMTP) as the thread anchor, email_id as the doc key
  const threadId = inReplyTo || emailId;

  console.log('Inbound email:', { emailId, from, to, subject, hasHtml: !!html, hasText: !!text });

  // ── 1. Deliver to ALL registered users immediately ────────────────────────
  // No privacy restriction — every registered user sees every inbound email.
  const allUsers = await User.find({}).select('_id').lean() as Array<{ _id: mongoose.Types.ObjectId }>;

  const userInserts = allUsers.map((u) =>
    Email.create({
      messageId: `${emailId}-uid-${u._id}`,
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
      userId: u._id,
    }).catch((err: { code?: number }) => {
      if (err?.code === 11000) return null; // duplicate (Resend retry) — safe to ignore
      throw err;
    })
  );

  const userResults = await Promise.all(userInserts);
  const deliveredCount = userResults.filter(Boolean).length;

  // ── 2. Park pending copies for unregistered recipient addresses ───────────
  // These are claimed automatically when the user signs up (see lib/auth.ts).
  const recipientEmails = [...new Set([...to, ...cc].map(extractEmail))];
  const registeredEmails = new Set(
    (await User.find({}).select('email').lean() as Array<{ email: string }>)
      .map((u) => u.email.toLowerCase())
  );

  const pendingInserts = recipientEmails
    .filter((e) => !registeredEmails.has(e.toLowerCase()))
    .map((recipientEmail) =>
      Email.create({
        messageId: `${emailId}-pending-${recipientEmail}`,
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
        pendingRecipientEmail: recipientEmail,
      }).catch((err: { code?: number }) => {
        if (err?.code === 11000) return null;
        throw err;
      })
    );

  const pendingResults = await Promise.all(pendingInserts);
  const pendingCount = pendingResults.filter(Boolean).length;

  console.log(
    `✓ "${subject}" from ${from} → ${deliveredCount} delivered, ${pendingCount} pending`
  );
}

function extractEmail(input: string): string {
  const match = input.match(/<(.+?)>/);
  return match ? match[1] : input.trim();
}
