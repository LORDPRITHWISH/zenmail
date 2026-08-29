'use client';

import { useEffect, useState } from 'react';
import { adminGetDomainStatus } from '@/app/actions/admin-actions';
import { CheckCircle, XCircle, WarningCircle, Copy } from '@phosphor-icons/react';

interface DomainRecord {
  record: string;
  name: string;
  value: string;
  type: string;
  ttl: string;
  status: string;
  priority?: number;
}

interface DomainInfo {
  id: string;
  name: string;
  status: string;
  region: string;
  createdAt: string;
  capabilities: { sending: string; receiving: string };
  records: DomainRecord[];
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'verified';
  const failed = status === 'failed' || status === 'temporary_failure' || status === 'partially_failed';
  const Icon = ok ? CheckCircle : failed ? XCircle : WarningCircle;
  const color = ok
    ? 'bg-emerald-500/10 text-emerald-600'
    : failed
      ? 'bg-rose-500/10 text-rose-600'
      : 'bg-amber-500/10 text-amber-600';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon size={12} weight="fill" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminDomainsPage() {
  const [domain, setDomain] = useState<DomainInfo | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    adminGetDomainStatus().then((result) => {
      if ('error' in result && result.error) {
        setError(result.error);
      } else if ('domain' in result) {
        setDomain(result.domain as DomainInfo);
      }
      setIsLoading(false);
    });
  }, []);

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(''), 1500);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Domain &amp; DNS Status</h1>

      {error ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : domain ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-foreground">{domain.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Region: {domain.region} · Added {new Date(domain.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={domain.status} />
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span>Sending: <span className="font-medium text-foreground">{domain.capabilities.sending}</span></span>
              <span>Receiving: <span className="font-medium text-foreground">{domain.capabilities.receiving}</span></span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Record</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.records.map((rec, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{rec.record}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{rec.type}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">{rec.name}</td>
                      <td className="max-w-[280px] px-4 py-3">
                        <button
                          onClick={() => copyValue(rec.value)}
                          className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
                          title="Copy value"
                        >
                          <Copy size={12} className="shrink-0" />
                          <span className="truncate">{copied === rec.value ? 'Copied!' : rec.value}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rec.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
