'use client';

import { useSession } from 'next-auth/react';
import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';

export function AdminHeader() {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {session?.user && (
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">
              {session.user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
