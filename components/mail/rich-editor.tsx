'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import ImageExt from '@tiptap/extension-image';
import {
  TextB,
  TextItalic,
  TextUnderline as TextUnderlineIcon,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  LinkSimple,
  Image as ImageIcon,
  Highlighter,
  Code,
  Quotes,
  ArrowUUpLeft,
  ArrowUUpRight,
} from '@phosphor-icons/react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichEditor({
  content,
  onChange,
  placeholder = 'Compose your email...',
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      ImageExt,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  const [urlPopover, setUrlPopover] = useState<'link' | 'image' | null>(null);
  const [urlValue, setUrlValue] = useState('');

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );

  const openLinkPopover = () => {
    setUrlValue((editor.getAttributes('link').href as string) || '');
    setUrlPopover('link');
  };

  const openImagePopover = () => {
    setUrlValue('');
    setUrlPopover('image');
  };

  const submitUrlPopover = () => {
    const url = urlValue.trim();
    if (url) {
      if (urlPopover === 'link') {
        editor.chain().focus().setLink({ href: url }).run();
      } else if (urlPopover === 'image') {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
    setUrlPopover(null);
    setUrlValue('');
  };

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <ArrowUUpLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <ArrowUUpRight size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <TextB size={15} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <TextItalic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <TextUnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <TextStrikethrough size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Text color */}
        <div className="relative">
          <input
            type="color"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
            title="Text color"
          />
          <div className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted">
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold">A</span>
              <div
                className="h-0.5 w-3 rounded-full"
                style={{
                  backgroundColor:
                    (editor.getAttributes('textStyle').color as string) ||
                    'currentColor',
                }}
              />
            </div>
          </div>
        </div>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <ListBullets size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListNumbers size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          <TextAlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          <TextAlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          <TextAlignRight size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quotes size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code block"
        >
          <Code size={15} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Link & Image */}
        <ToolbarButton
          onClick={openLinkPopover}
          isActive={editor.isActive('link')}
          title="Add link"
        >
          <LinkSimple size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={openImagePopover} title="Add image">
          <ImageIcon size={15} />
        </ToolbarButton>
      </div>

      {/* URL input popover for link/image */}
      {urlPopover && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <input
            autoFocus
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitUrlPopover();
              }
              if (e.key === 'Escape') {
                setUrlPopover(null);
                setUrlValue('');
              }
            }}
            placeholder={
              urlPopover === 'link'
                ? 'https://example.com'
                : 'https://example.com/image.png'
            }
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={submitUrlPopover}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {urlPopover === 'link' ? 'Add link' : 'Add image'}
          </button>
          <button
            type="button"
            onClick={() => {
              setUrlPopover(null);
              setUrlValue('');
            }}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
