'use client';

import { useState, useRef, useEffect, useId, KeyboardEvent } from 'react';
import { getContacts } from '@/app/actions/email-actions';
import { X } from '@phosphor-icons/react';

// Fetched once per page load and shared by every recipient field.
let contactsPromise: Promise<string[]> | null = null;

function loadContacts(): Promise<string[]> {
  contactsPromise ??= getContacts().then((r) => r.contacts);
  return contactsPromise;
}

interface RecipientInputProps {
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
}

export function RecipientInput({
  label,
  recipients,
  onChange,
  placeholder = 'Add recipient...',
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // The browser's own datalist handles filtering and the dropdown UI.
  useEffect(() => {
    let cancelled = false;
    loadContacts().then((list) => {
      if (!cancelled) setContacts(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addRecipient = (value: string) => {
    const email = value.trim().toLowerCase();
    if (email && !recipients.includes(email) && email.includes('@')) {
      onChange([...recipients, email]);
      setInputValue('');
    }
  };

  const removeRecipient = (index: number) => {
    onChange(recipients.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addRecipient(inputValue);
    }

    if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const emails = text.split(/[,;\s]+/).filter((s) => s.includes('@'));
    const unique = emails.filter((e) => !recipients.includes(e.trim().toLowerCase()));
    if (unique.length > 0) {
      onChange([...recipients, ...unique.map((e) => e.trim().toLowerCase())]);
    }
  };

  return (
    <div className="flex items-start gap-2 border-b border-border px-4 py-2">
      <label className="shrink-0 pt-1.5 text-sm text-muted-foreground">
        {label}
      </label>
      <div
        className="flex flex-1 flex-wrap items-center gap-1.5"
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((email, index) => (
          <span
            key={index}
            className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {email}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeRecipient(index);
              }}
              className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
            >
              <X size={10} weight="bold" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          list={listId}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue) addRecipient(inputValue);
          }}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <datalist id={listId}>
          {contacts
            .filter((c) => !recipients.includes(c))
            .map((c) => (
              <option key={c} value={c} />
            ))}
        </datalist>
      </div>
    </div>
  );
}
