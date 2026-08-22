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
  const { data: full, error } = await resend.emails.receiving.get(emailId);

  if (error || !full) {
    console.error('Failed to retrieve full email content for', emailId, error);
  }

  const from    = (full?.from ?? webhookData.from) as string;
  const to      = ((full?.to ?? webhookData.to) as string[]) || [];
  const cc      = ((full?.cc ?? webhookData.cc) as string[]) || [];
  const subject = ((full?.subject ?? webhookData.subject) as string) || '(No Subject)';
  const html    = full?.html as string | undefined;
  const text    = full?.text as string | undefined;
  const inReplyTo  = webhookData.in_reply_to as string | undefined;
  const references = (webhookData.references as string[]) || [];

  const threadId = inReplyTo || emailId;

  console.log('Inbound email:', { emailId, from, to, subject, hasHtml: !!html, hasText: !!text });

  // ── Resolve each recipient to a userId (real or placeholder) ─────────────
  // Only the actual addressees get this email in their inbox.
  const recipientAddresses = [...new Set([...to, ...cc].map(extractEmail))];

  let deliveredCount = 0;

  for (const address of recipientAddresses) {
    const normalised = address.toLowerCase();

    // 1. Try to find an existing user (real or placeholder) for this address
    let user = await User.findOne({ email: normalised }).lean() as
      | { _id: mongoose.Types.ObjectId; isPlaceholder?: boolean }
      | null;

    // 2. If no user at all → create a placeholder so we have a stable userId
    if (!user) {
      try {
        const created = await User.create({
          email: normalised,
          isPlaceholder: true,
        });
        user = { _id: created._id, isPlaceholder: true };
        console.log(`Created placeholder user for <${normalised}>`);
      } catch (err: unknown) {
        // Race condition: another request may have created it concurrently
        const e = err as { code?: number };
        if (e?.code === 11000) {
          user = await User.findOne({ email: normalised }).lean() as
            | { _id: mongoose.Types.ObjectId }
            | null;
        } else {
          console.error(`Failed to create placeholder for ${normalised}:`, err);
          continue; // skip this recipient
        }
      }
    }

    if (!user) continue;

    // 3. Store the email in that user's inbox
    try {
      await Email.create({
        messageId: `${emailId}-uid-${user._id}`,
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
        userId: user._id,
      });
      deliveredCount++;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e?.code === 11000) {
        // Resend retry — already stored, safe to ignore
      } else {
        console.error(`Failed to store email for ${normalised}:`, err);
      }
    }
  }

  console.log(`✓ "${subject}" from ${from} → ${deliveredCount}/${recipientAddresses.length} recipients stored`);
}

function extractEmail(input: string): string {
  const match = input.match(/<(.+?)>/);
  return match ? match[1] : input.trim();
}
