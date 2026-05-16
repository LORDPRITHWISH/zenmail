"use client"

import { signIn } from "next-auth/react"
import { useState, useEffect, useRef } from "react"

const FEATURES = [
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Blazing Fast",
    desc: "Instant search, zero-lag navigation. Your inbox loads before you blink.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
      </svg>
    ),
    title: "Private & Secure",
    desc: "End-to-end encrypted. Your conversations stay between you and your recipients.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" strokeLinecap="round" />
      </svg>
    ),
    title: "Smart Scheduling",
    desc: "Send emails at the perfect moment. Schedule with precision, down to the minute.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Rich Composer",
    desc: "A distraction-free editor with formatting, embeds, and beautiful templates.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
    title: "Analytics Dashboard",
    desc: "Track open rates, reply times, and engagement across all your emails.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: "Smart Filters",
    desc: "AI-powered categorization keeps your inbox clean and your priorities clear.",
  },
]

const TESTIMONIALS = [
  {
    name: "Aria Chen",
    role: "Product Designer",
    avatar: "A",
    color: "oklch(0.65 0.18 265)",
    quote: `ZenMail is the first email client that actually respects my time. The UI is just chef's kiss.`,
  },
  {
    name: "Marcus Webb",
    role: "Software Engineer",
    avatar: "M",
    color: "oklch(0.65 0.18 300)",
    quote:
      "Switched from Gmail and never looked back. The keyboard shortcuts alone saved me hours a week.",
  },
  {
    name: "Priya Nair",
    role: "Startup Founder",
    avatar: "P",
    color: "oklch(0.65 0.18 220)",
    quote:
      "Managing investor emails used to be chaos. ZenMail turned it into a superpower.",
  },
]

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1800
          const step = target / (duration / 16)
          let current = 0
          const timer = setInterval(() => {
            current += step
            if (current >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, 16)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])

  const handleSignIn = () => {
    setLoading(true)
    signIn("google", { callbackUrl: "/inbox" })
  }

  return (
    <div className="landing-root">
      {/* Cursor glow */}
      <div
        className="landing-cursor-glow"
        style={{
          left: mousePos.x,
          top: mousePos.y,
        }}
      />

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon overflow-hidden rounded-md">
              <img src="/zenmail.png" alt="ZenMail Logo" className="w-full h-full object-cover" />
            </div>
            <span className="landing-logo-text">ZenMail</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">
              Features
            </a>
            <a href="#stats" className="landing-nav-link">
              Stats
            </a>
            <a href="#testimonials" className="landing-nav-link">
              Reviews
            </a>
          </div>
          <button
            id="nav-signin-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="landing-btn-outline"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        {/* Gradient orbs */}
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />

        {/* Grid pattern */}
        <div className="landing-grid" />

        <div className="landing-hero-inner">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Now in open beta — free forever
          </div>

          <h1 className="landing-hero-title">
            Email, finally
            <br />
            <span className="landing-hero-gradient">at peace.</span>
          </h1>

          <p className="landing-hero-sub">
            ZenMail is a minimal, blazing-fast email client built for people who
            value focus. No clutter. No noise. Just your inbox, beautifully
            organized.
          </p>

          <div className="landing-hero-actions">
            <button
              id="hero-signin-btn"
              onClick={handleSignIn}
              disabled={loading}
              className="landing-btn-primary"
            >
              {loading ? (
                <span className="landing-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {loading ? "Redirecting…" : "Get started"}
            </button>
            <a href="#features" className="landing-btn-ghost">
              See features
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

          {/* Mock inbox preview */}
          <div className="landing-preview">
            <div className="landing-preview-bar">
              <div className="landing-preview-dots">
                <span style={{ background: "#ff5f57" }} />
                <span style={{ background: "#febc2e" }} />
                <span style={{ background: "#28c840" }} />
              </div>
              <span className="landing-preview-url">zenmail.app/inbox</span>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-sidebar">
                {["Inbox", "Starred", "Sent", "Drafts", "Archive"].map(
                  (f, i) => (
                    <div
                      key={f}
                      className={`landing-preview-folder ${i === 0 ? "active" : ""}`}
                    >
                      <span
                        className="landing-preview-folder-dot"
                        style={{ opacity: i === 0 ? 1 : 0.4 }}
                      />
                      {f}
                    </div>
                  )
                )}
              </div>
              <div className="landing-preview-list">
                {[
                  {
                    from: "Sarah K.",
                    subj: "Design review tomorrow ✓",
                    time: "9:41 AM",
                    unread: true,
                  },
                  {
                    from: "GitHub",
                    subj: "PR #142 merged successfully",
                    time: "8:15 AM",
                    unread: false,
                  },
                  {
                    from: "Liam T.",
                    subj: "Let's sync on the Q3 roadmap",
                    time: "Yesterday",
                    unread: true,
                  },
                  {
                    from: "Notion",
                    subj: "Your weekly digest is ready",
                    time: "Yesterday",
                    unread: false,
                  },
                ].map((email, i) => (
                  <div
                    key={i}
                    className={`landing-preview-email ${email.unread ? "unread" : ""}`}
                  >
                    <div className="landing-preview-avatar">
                      {email.from[0]}
                    </div>
                    <div className="landing-preview-email-meta">
                      <div className="landing-preview-email-row">
                        <span className="landing-preview-from">
                          {email.from}
                        </span>
                        <span className="landing-preview-time">
                          {email.time}
                        </span>
                      </div>
                      <span className="landing-preview-subj">{email.subj}</span>
                    </div>
                    {email.unread && (
                      <div className="landing-preview-unread-dot" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="landing-stats">
        <div className="landing-stats-inner">
          {[
            { value: 50, suffix: "K+", label: "Active users" },
            { value: 99, suffix: ".9%", label: "Uptime SLA" },
            { value: 2, suffix: "M+", label: "Emails handled daily" },
            { value: 4, suffix: "ms", label: "Avg. load time" },
          ].map((stat) => (
            <div key={stat.label} className="landing-stat">
              <div className="landing-stat-value">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="landing-features">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">Features</span>
            <h2 className="landing-section-title">
              Everything you need.
              <br />
              Nothing you don&apos;t.
            </h2>
            <p className="landing-section-sub">
              Thoughtfully crafted tools that get out of your way and let you
              focus on what matters.
            </p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="landing-testimonials">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">Testimonials</span>
            <h2 className="landing-section-title">Loved by makers worldwide</h2>
          </div>
          <div className="landing-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="landing-testimonial-card">
                <div className="landing-testimonial-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="landing-testimonial-quote">{`"${t.quote}"`}</p>
                <div className="landing-testimonial-author">
                  <div
                    className="landing-testimonial-avatar"
                    style={{ background: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="landing-testimonial-name">{t.name}</div>
                    <div className="landing-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-orb-1" />
        <div className="landing-cta-orb-2" />
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">
            Ready to reach
            <span className="landing-hero-gradient"> inbox zero?</span>
          </h2>
          <p className="landing-cta-sub">
            Join thousands of people who&apos;ve already discovered a calmer way
            to email.
          </p>
          <button
            id="cta-signin-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="landing-btn-primary"
          >
            {loading ? (
              <span className="landing-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {loading ? "Redirecting…" : "Get started for free"}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon overflow-hidden rounded-sm" style={{ width: 16, height: 16 }}>
              <img src="/zenmail.png" alt="ZenMail Logo" className="w-full h-full object-cover" />
            </div>
            <span className="landing-logo-text" style={{ fontSize: "0.9rem" }}>
              ZenMail
            </span>
          </div>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} ZenMail · Built with Next.js · Powered
            by Resend
          </p>
        </div>
      </footer>
    </div>
  )
}
