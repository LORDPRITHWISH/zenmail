'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X } from '@phosphor-icons/react';

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      </div>
    </div>
  );
}
