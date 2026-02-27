import { useEffect, useMemo, useState } from "react";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold as BoldIcon,
  Heading1 as Heading1Icon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Italic as ItalicIcon,
  List as BulletListIcon,
  ListOrdered as OrderedListIcon,
  Redo2 as RedoIcon,
  Undo2 as UndoIcon,
} from "lucide-react";

type Props = {
  id: string;
  name: string;
  initialValue: string;
  required?: boolean;
};

function toolButtonClass(isActive: boolean) {
  return [
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    isActive ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary",
  ].join(" ");
}

export default function RichTextField({ id, name, initialValue, required = false }: Props) {
  const [html, setHtml] = useState(initialValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
    ],
    content: initialValue,
    onUpdate: ({ editor: nextEditor }) => {
      setHtml(nextEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
        id,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    setHtml(editor.getHTML());
  }, [editor]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      h2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      h3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      h4: currentEditor?.isActive("heading", { level: 4 }) ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
    }),
  });

  const validationValue = useMemo(
    () => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(),
    [html],
  );

  if (!editor) {
    return (
      <>
        <textarea
          id={id}
          name={name}
          rows={10}
          required={required}
          defaultValue={initialValue}
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
        />
      </>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          title="Heading 2"
          aria-label="Heading 2"
          className={toolButtonClass(Boolean(toolbarState?.h2))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading1Icon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Heading 3"
          aria-label="Heading 3"
          className={toolButtonClass(Boolean(toolbarState?.h3))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading2Icon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Heading 4"
          aria-label="Heading 4"
          className={toolButtonClass(Boolean(toolbarState?.h4))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <Heading3Icon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Bold"
          aria-label="Bold"
          className={toolButtonClass(Boolean(toolbarState?.bold))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Italic"
          aria-label="Italic"
          className={toolButtonClass(Boolean(toolbarState?.italic))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Bullet list"
          aria-label="Bullet list"
          className={toolButtonClass(Boolean(toolbarState?.bulletList))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Numbered list"
          aria-label="Numbered list"
          className={toolButtonClass(Boolean(toolbarState?.orderedList))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          className={toolButtonClass(false)}
          disabled={!toolbarState?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          className={toolButtonClass(false)}
          disabled={!toolbarState?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
      {required ? <input type="text" value={validationValue} required readOnly className="sr-only" tabIndex={-1} aria-hidden="true" /> : null}
    </div>
  );
}
