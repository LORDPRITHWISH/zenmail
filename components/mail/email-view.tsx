"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  getEmail,
  getThread,
  toggleStar,
  toggleRead,
  deleteEmails,
  cancelScheduled,
  getUnreadCounts,
} from "@/app/actions/email-actions"
import { toggleEmailLabel } from "@/app/actions/label-actions"
import { useMailStore } from "@/lib/store"
import {
  ArrowLeft,
  Star,
  Trash,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowsClockwise,
  Paperclip,
  DownloadSimple,
  EnvelopeSimple,
  Tag,
  CaretDown,
  CaretRight,
  ClockCountdown,
} from "@phosphor-icons/react"

interface EmailViewProps {
  emailId: string
}

interface ThreadMessage {
  id: string
  from: string
  to: string[]
  subject: string
  text?: string
  html?: string
  folder: string
  createdAt: string
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function extractName(from: string): string {
  const match = from.match(/^"?(.+?)"?\s*<.+>$/)
  return match ? match[1] : from.split("@")[0]
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function ThreadRow({
  message,
  isOpen,
  onToggle,
}: {
  message: ThreadMessage
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        {isOpen ? (
          <CaretDown size={14} className="shrink-0 text-muted-foreground" />
        ) : (
          <CaretRight size={14} className="shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 text-sm font-medium text-foreground">
          {extractName(message.from)}
        </span>
        {!isOpen && (
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {(message.text || message.html?.replace(/<[^>]*>/g, "") || "").trim().slice(0, 120)}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border px-4 py-3">
          {message.html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: message.html }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-foreground/80">
              {message.text}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function EmailView({ emailId }: EmailViewProps) {
  const router = useRouter()
  const { openReply, labels, patchEmail, setUnreadCounts } = useMailStore()
  const [email, setEmail] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false)
  // Stored with the id it belongs to, so a previous email's thread can never
  // flash on screen while the new one loads.
  const [loadedThread, setLoadedThread] = useState<{ id: string; messages: ThreadMessage[] }>({
    id: '',
    messages: [],
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cancelError, setCancelError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoading(true)
    getEmail(emailId).then((result) => {
      if (result.email) {
        setEmail(result.email)
        // getEmail always marks the email read as a side effect
        patchEmail(emailId, { isRead: true })
        getUnreadCounts().then((r) => {
          if (r.counts) setUnreadCounts(r.counts)
        })
      }
      setIsLoading(false)
    })
  }, [emailId, patchEmail, setUnreadCounts])

  // Pull in the rest of the conversation, if this message is part of one.
  useEffect(() => {
    const threadId = email?.threadId as string | undefined
    if (!threadId) return
    let cancelled = false
    getThread(threadId, emailId).then((result) => {
      if (!cancelled) setLoadedThread({ id: emailId, messages: result.messages })
    })
    return () => {
      cancelled = true
    }
  }, [email, emailId])

  // Open links in the email body in a new tab
  useEffect(() => {
    if (!bodyRef.current) return
    const links = bodyRef.current.querySelectorAll("a")
    links.forEach((link) => {
      link.setAttribute("target", "_blank")
      link.setAttribute("rel", "noopener noreferrer")
    })
  }, [email])

  const handleToggleRead = () => {
    startTransition(async () => {
      const result = await toggleRead(emailId)
      if (result.success) {
        setEmail((prev) => (prev ? { ...prev, isRead: result.isRead } : prev))
        patchEmail(emailId, { isRead: result.isRead })
        const counts = await getUnreadCounts()
        if (counts.counts) setUnreadCounts(counts.counts)
      }
    })
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleLabel = (labelId: string) => {
    startTransition(async () => {
      const result = await toggleEmailLabel(emailId, labelId)
      if (result.success) {
        setEmail((prev) => {
          if (!prev) return prev
          const current = (prev.labels as string[]) || []
          const next = result.added
            ? [...current, labelId]
            : current.filter((id) => id !== labelId)
          patchEmail(emailId, { labels: next })
          return { ...prev, labels: next }
        })
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Email not found</p>
      </div>
    )
  }

  const senderName = extractName(email.from as string)
  const senderEmail = extractEmail(email.from as string)
  const attachments =
    (email.attachments as Array<Record<string, unknown>>) || []
  const emailLabelIds = (email.labels as string[]) || []
  const emailLabels = labels.filter((l) => emailLabelIds.includes(l.id))

  const thread = loadedThread.id === emailId ? loadedThread.messages : []
  const openedAt = new Date(email.createdAt as string).getTime()
  const earlier = thread.filter((m) => new Date(m.createdAt).getTime() <= openedAt)
  const later = thread.filter((m) => new Date(m.createdAt).getTime() > openedAt)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1" />

        <button
          onClick={handleToggleRead}
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title={(email.isRead as boolean) ? "Mark as unread" : "Mark as read"}
        >
          <EnvelopeSimple size={18} weight={(email.isRead as boolean) ? "regular" : "fill"} />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsLabelMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Labels"
          >
            <Tag size={18} />
          </button>
          {isLabelMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsLabelMenuOpen(false)}
              />
              <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                {labels.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    No labels yet
                  </p>
                ) : (
                  labels.map((label) => {
                    const checked = emailLabelIds.includes(label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 truncate">{label.name}</span>
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() =>
            startTransition(async () => {
              await toggleStar(emailId)
              const result = await getEmail(emailId)
              if (result.email) setEmail(result.email)
            })
          }
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <Star
            size={18}
            weight={(email.isStarred as boolean) ? "fill" : "regular"}
            className={(email.isStarred as boolean) ? "text-amber-400" : ""}
          />
        </button>

        <button
          onClick={() =>
            startTransition(async () => {
              await deleteEmails([emailId])
              router.back()
            })
          }
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash size={18} />
        </button>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Subject */}
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {email.subject as string}
        </h1>

        {/* Label chips */}
        {emailLabels.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {emailLabels.map((label) => (
              <span
                key={label.id}
                className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${label.color}1a`, color: label.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Held for scheduled delivery */}
        {email.folder === "scheduled" && email.scheduledAt ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
            <ClockCountdown size={18} className="shrink-0 text-primary" />
            <span className="flex-1 text-sm text-foreground">
              Scheduled to send {formatFullDate(email.scheduledAt as string)}
            </span>
            <button
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelScheduled(emailId)
                  if (result.error) setCancelError(result.error)
                  else router.push("/drafts")
                })
              }
              disabled={isPending}
              className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              Cancel send
            </button>
          </div>
        ) : null}

        {cancelError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
            {cancelError}
          </div>
        )}

        {/* Earlier messages in this conversation */}
        {earlier.length > 0 && (
          <div className="mb-4 space-y-2">
            {earlier.map((m) => (
              <ThreadRow
                key={m.id}
                message={m}
                isOpen={expanded.has(m.id)}
                onToggle={() => toggleExpanded(m.id)}
              />
            ))}
          </div>
        )}

        {/* Sender info */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(senderName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-foreground">{senderName}</span>
              <span className="text-xs text-muted-foreground">
                &lt;{senderEmail}&gt;
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              to{" "}
              {(email.to as string[])
                .map((t: string) => extractName(t))
                .join(", ")}
              {(email.cc as string[])?.length > 0 && (
                <span>
                  , cc:{" "}
                  {(email.cc as string[])
                    .map((t: string) => extractName(t))
                    .join(", ")}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground/60">
              {formatFullDate(email.createdAt as string)}
            </div>
          </div>
        </div>

        {/* Email body */}
        <div className="rounded-xl border border-border bg-card p-6">
          {email.html ? (
            <div
              ref={bodyRef}
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: email.html as string }}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap text-foreground/80">
              {email.text as string}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Paperclip size={16} />
              {attachments.length} Attachment{attachments.length > 1 ? "s" : ""}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id as string}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {(att.filename as string)
                      .split(".")
                      .pop()
                      ?.toUpperCase()
                      .slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {att.filename as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.size as number)}
                    </p>
                  </div>
                  <a
                    href={`data:${(att.contentType as string) || "application/octet-stream"};base64,${att.content as string}`}
                    download={att.filename as string}
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={`Download ${att.filename as string}`}
                  >
                    <DownloadSimple size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Later replies in this conversation */}
        {later.length > 0 && (
          <div className="mt-4 space-y-2">
            {later.map((m) => (
              <ThreadRow
                key={m.id}
                message={m}
                isOpen={expanded.has(m.id)}
                onToggle={() => toggleExpanded(m.id)}
              />
            ))}
          </div>
        )}

        {/* Reply actions */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() =>
              openReply(
                email as unknown as import("@/lib/store").EmailItem,
                "reply"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowBendUpLeft size={16} />
            Reply
          </button>
          <button
            onClick={() =>
              openReply(
                email as unknown as import("@/lib/store").EmailItem,
                "replyAll"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowsClockwise size={16} />
            Reply All
          </button>
          <button
            onClick={() =>
              openReply(
                email as unknown as import("@/lib/store").EmailItem,
                "forward"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowBendUpRight size={16} />
            Forward
          </button>
        </div>
      </div>
    </div>
  )
}
