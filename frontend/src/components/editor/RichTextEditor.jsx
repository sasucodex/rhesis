import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, Undo, Redo, Save, X } from 'lucide-react'
import { parseTimestampToSeconds } from '../../utils/audioUtils'

export default function RichTextEditor({ content, onSave, onCancel, onSeek }) {
  const [, setRevision] = useState(0)

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content,
    onTransaction: () => {
      setRevision((r) => r + 1)
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-zinc max-w-none focus:outline-none min-h-[400px]',
      },
      handleClick: (view, pos, event) => {
        if (!onSeek) return false

        const target = event.target
        const badge = target?.closest?.('[data-timestamp]')
        if (badge) {
          const timeStr = badge.getAttribute('data-timestamp')
          const seconds = parseTimestampToSeconds(timeStr)
          if (seconds !== null) {
            onSeek(seconds)
            return true
          }
        }

        try {
          const $pos = view.state.doc.resolve(pos)
          const parent = $pos.parent
          if (parent && parent.isTextblock) {
            const text = parent.textContent
            const offset = $pos.parentOffset
            const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g
            let match
            while ((match = regex.exec(text)) !== null) {
              const start = match.index
              const end = start + match[0].length
              if (offset >= start && offset <= end) {
                const seconds = parseTimestampToSeconds(match[1])
                if (seconds !== null) {
                  onSeek(seconds)
                  return true
                }
              }
            }
          }
        } catch {
          return false
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const btnBase = 'p-2 rounded transition-all flex items-center justify-center'
  const btnActive = 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-inner'
  const btnInactive = 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] px-4 py-3 sticky top-0 z-10 rounded-t-3xl">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btnBase} ${editor.isActive('bold') ? btnActive : btnInactive}`}
            title="Grassetto"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btnBase} ${editor.isActive('italic') ? btnActive : btnInactive}`}
            title="Corsivo"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`${btnBase} ${editor.isActive('underline') ? btnActive : btnInactive}`}
            title="Sottolineato"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`p-2 rounded transition-opacity ${
              !editor.can().undo()
                ? 'opacity-30 cursor-not-allowed text-zinc-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
            title="Indietro"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`p-2 rounded transition-opacity ${
              !editor.can().redo()
                ? 'opacity-30 cursor-not-allowed text-zinc-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
            title="Avanti"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" /> Annulla
          </button>
          <button
            type="button"
            onClick={() => onSave(editor.getHTML())}
            className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Salva modifiche
          </button>
        </div>
      </div>
      <div
        className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#131314]"
        onClick={(e) => {
          if (!onSeek) return
          const badge = e.target.closest?.('[data-timestamp]')
          if (badge) {
            const timeStr = badge.getAttribute('data-timestamp')
            const seconds = parseTimestampToSeconds(timeStr)
            if (seconds !== null) {
              onSeek(seconds)
            }
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
