'use client';

import { useEffect, useState, useTransition } from 'react';
import { useMailStore } from '@/lib/store';
import {
  getSettings,
  saveSignature,
  createRule,
  deleteRule,
} from '@/app/actions/settings-actions';
import { RULE_FIELDS, RULE_ACTIONS } from '@/lib/constants';
import { RichEditor } from './rich-editor';
import { Plus, Trash, FloppyDisk, Check } from '@phosphor-icons/react';

interface RuleItem {
  id: string;
  field: string;
  contains: string;
  action: string;
  labelId: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  from: 'Sender',
  to: 'Recipient',
  subject: 'Subject',
  body: 'Body',
};

const ACTION_LABELS: Record<string, string> = {
  label: 'apply label',
  archive: 'skip the inbox (archive)',
  spam: 'mark as spam',
  star: 'star it',
  trash: 'move to trash',
};

export function SettingsView() {
  const { labels } = useMailStore();
  const [signature, setSignature] = useState('');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSignature, setSavedSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [field, setField] = useState<string>('from');
  const [contains, setContains] = useState('');
  const [action, setAction] = useState<string>('label');
  const [labelId, setLabelId] = useState<string>('');

  useEffect(() => {
    getSettings().then((result) => {
      setSignature(result.signature);
      setRules(result.rules);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!savedSignature) return;
    const timer = setTimeout(() => setSavedSignature(false), 2000);
    return () => clearTimeout(timer);
  }, [savedSignature]);

  const handleSaveSignature = () => {
    startTransition(async () => {
      const result = await saveSignature(signature);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setSavedSignature(true);
      }
    });
  };

  const handleAddRule = () => {
    startTransition(async () => {
      const result = await createRule({
        field,
        contains,
        action,
        labelId: action === 'label' ? labelId || labels[0]?.id : null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.rule) {
        setError(null);
        setRules((prev) => [...prev, result.rule]);
        setContains('');
      }
    });
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await deleteRule(id);
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Signature */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Signature</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Added to new messages and replies, where you can still edit it before sending.
          </p>
          <div className="mt-3 rounded-xl border border-border bg-card">
            <RichEditor
              content={signature}
              onChange={setSignature}
              placeholder="Your name, role, links…"
            />
          </div>
          <button
            onClick={handleSaveSignature}
            disabled={isPending}
            className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {savedSignature ? <Check size={16} weight="bold" /> : <FloppyDisk size={16} />}
            {savedSignature ? 'Saved' : 'Save signature'}
          </button>
        </section>

        {/* Filters */}
        <section className="mt-10 pb-10">
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied to mail as it arrives. Matching is plain text, not case sensitive.
          </p>

          <div className="mt-3 space-y-2">
            {rules.map((rule) => {
              const label = labels.find((l) => l.id === rule.labelId);
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    If <span className="text-foreground">{FIELD_LABELS[rule.field]}</span> contains
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    {rule.contains}
                  </span>
                  <span className="text-muted-foreground">→ {ACTION_LABELS[rule.action]}</span>
                  {label && (
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${label.color}1a`, color: label.color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete filter"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              );
            })}

            {rules.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No filters yet. Incoming mail all goes to the inbox.
              </p>
            )}
          </div>

          {/* New filter */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm">
            <span className="text-muted-foreground">If</span>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {RULE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">contains</span>
            <input
              type="text"
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && contains.trim() && handleAddRule()}
              placeholder="newsletter@…"
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <span className="text-muted-foreground">then</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {RULE_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a]}
                </option>
              ))}
            </select>
            {action === 'label' && (
              <select
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Pick a label…</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleAddRule}
              disabled={isPending || !contains.trim() || (action === 'label' && !labelId)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus size={14} weight="bold" />
              Add
            </button>
          </div>

          {action === 'label' && labels.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Create a label in the sidebar first.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
