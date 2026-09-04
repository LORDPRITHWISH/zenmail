import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { Webhook } from 'svix';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';
import { Rule, IRule } from '@/models/Rule';
import { WebhookEvent } from '@/models/WebhookEvent';
import { routeWithRules } from '@/lib/rules';
import mongoose from 'mongoose';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Health telemetry for /admin/webhooks. Never throws — a failure to record must
 * not turn a delivered email into a retried one.
 */
async function record(
  type: string,
  emailId: string | undefined,
  status: 'ok' | 'failed',
  detail: string
) {
  try {
    await connectDB();
    await WebhookEvent.create({ type, emailId, status, detail: detail.slice(0, 500) });
  } catch (err) {
    console.error('Failed to record webhook event:', err);
  }
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set — refusing unverified webhooks');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Signature verification needs the raw bytes, so read text before parsing.
  const raw = await request.text();

  let body: Record<string, unknown>;
  try {
    body = new Webhook(secret).verify(raw, {
      'svix-id': request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    }) as Record<string, unknown>;
  } catch (err) {
    console.warn('Rejected webhook with bad signature:', err);
    // A rotated secret rejects every delivery, so this is worth surfacing.
    await record('signature.invalid', undefined, 'failed', 'signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const eventType = (body.type as string) || 'email.received';
  const data = (body.data as Record<string, unknown>) ?? body;
  const emailId = (data.email_id as string) || undefined;

  try {
    await connectDB();

    if (eventType === 'email.received') {
      const { delivered, total } = await handleInboundEmail(data);
      await record(
        eventType,
        emailId,
        delivered === total ? 'ok' : 'failed',
        `${delivered}/${total} recipients stored`
      );
    } else if (eventType === 'email.bounced') {
      console.warn('Email bounced:', emailId);
      await record(eventType, emailId, 'failed', `bounced to ${(data.to as string[])?.join(', ') ?? '?'}`);
    } else {
      // Ignore email.sent — we track those ourselves
      await record(eventType, emailId, 'ok', 'ignored');
    }
  } catch (err) {
    console.error(`Error handling ${eventType}:`, err);
    await record(eventType, emailId, 'failed', String(err));
    // Signature already checked, so a 200 here only suppresses retries of a
    // request we genuinely failed to process.
  }

  return NextResponse.json({ received: true });
}

async function handleInboundEmail(
  webhookData: Record<string, unknown>
): Promise<{ delivered: number; total: number }> {
  const emailId = webhookData.email_id as string;

  if (!emailId) {
    console.error('Inbound webhook missing email_id', webhookData);
    throw new Error('inbound webhook missing email_id');
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

  if (recipientAddresses.length === 0) {
    throw new Error(`inbound email ${emailId} has no resolvable recipients`);
  }

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

    // 3. Let this recipient's filters decide where it lands
    const rules = (await Rule.find({ userId: user._id }).sort({ createdAt: 1 }).lean()) as IRule[];
    const routed = routeWithRules({ from, to, subject, text, html }, rules);

    // 4. Store the email in that user's inbox
    try {
      await Email.create({
        messageId: `${emailId}-uid-${user._id}`,
        from,
        to,
        cc,
        subject,
        html,
        text,
        folder: routed.folder,
        isRead: false,
        isStarred: routed.isStarred,
        labels: routed.labels,
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

  return { delivered: deliveredCount, total: recipientAddresses.length };
}

function extractEmail(input: string): string {
  const match = input.match(/<(.+?)>/);
  return match ? match[1] : input.trim();
}
