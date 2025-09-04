// src/QuickNotes.tsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './styles/global.css';   // 引入主题变量 & 通用样式
import './styles/theme.css';

type Note = {
  id: string;
  title: string;
  content: any;
  tags: string[];
  updated_at: string;
};

/* 顶部工具栏按钮小组件 */
const ToolbarBtn = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props} style={{ marginLeft: '.5rem', ...props.style }} />
);

export default function QuickNotes({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  /* ---------- 实时订阅 ---------- */
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel('quick_notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_notes' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function refresh() {
    const { data } = await supabase.from('quick_notes').select('*').order('updated_at', { ascending: false });
    setNotes(data ?? []);
  }

  /* ---------- TipTap 编辑器 ---------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '开始记录…' }),
    ],
    content: '',
  });

  /* 切换笔记时加载内容 */
  useEffect(() => {
    if (!editor) return;
    const note = notes.find((n) => n.id === activeId);
    if (note) editor.commands.setContent(note.content, { emitUpdate: false });
    else editor.commands.clearContent(false);
  }, [activeId, editor, notes]);

  /* ---------- CRUD ---------- */
  async function createNote() {
    const { data } = await supabase
      .from('quick_notes')
      .insert({ title: '未命名', content: { type: 'doc', content: [] } })
      .select();
    if (data?.[0]) setActiveId(data[0].id);
  }

  async function saveNote() {
    if (!activeId || !editor) return;
    await supabase.from('quick_notes').update({ content: editor.getJSON() }).eq('id', activeId);
  }

  async function saveTitle(title: string) {
    if (!activeId) return;
    await supabase.from('quick_notes').update({ title }).eq('id', activeId);
  }

  async function delNote(id: string) {
    if (!window.confirm('删除不可恢复，确定？')) return;
    await supabase.from('quick_notes').delete().eq('id', id);
    if (id === activeId) setActiveId(null);
  }

  const activeNote = notes.find((n) => n.id === activeId);

  /* ---------- UI ---------- */
  return (
    <div className="qn-shell">
      {/* 左侧列表栏 */}
      <aside className="qn-sidebar">
        <div className="qn-sidebar-header">
          <h2>Quick Notes</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <button className="btn primary" onClick={createNote}>＋ 新建随笔</button>

        <ul className="qn-list">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`qn-item ${n.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(n.id)}
            >
              <div className="title">{n.title || '未命名'}</div>
              <div className="date">{new Date(n.updated_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </aside>

      {/* 右侧编辑器 */}
      {activeNote ? (
        <main className="qn-editor">
          <input
            className="qn-title"
            defaultValue={activeNote.title}
            onBlur={(e) => saveTitle(e.target.value)}
            placeholder="标题"
          />

          <div className="qn-editor-wrapper">
            <EditorContent editor={editor} className="qn-editor-content" />
          </div>

          <div className="qn-toolbar">
            <ToolbarBtn onClick={saveNote}>保存正文</ToolbarBtn>
            <ToolbarBtn
              onClick={() => delNote(activeNote.id)}
              style={{ background: 'var(--error, #ef4444)' }}
            >
              删除
            </ToolbarBtn>
          </div>
        </main>
      ) : (
        <main className="qn-empty">
          <span>选择或创建一条随笔开始写作</span>
        </main>
      )}
    </div>
  );
}