// src/components/TodoPanel.tsx  （示例，其它组件同理包一层 card）
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Todo = { id: string; title: string; status: string }

export default function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    const ch = supabase.channel('todos').on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, refresh).subscribe()
    refresh()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function refresh() {
    const { data } = await supabase.from('todos').select('*')
    setTodos(data ?? [])
  }

  async function add() {
    if (!title.trim()) return
    await supabase.from('todos').insert({ title, status: 'todo' })
    setTitle('')
  }

  async function toggle(todo: Todo) {
    const next = todo.status === 'done' ? 'todo' : 'done'
    await supabase.from('todos').update({ status: next }).eq('id', todo.id)
  }

  async function del(id: string) {
    await supabase.from('todos').delete().eq('id', id)
  }

  return (
    <div className="card">
      <h3>Todo List</h3>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="新任务"
        />
        <button onClick={add}>添加</button>
      </div>
      <ul style={{ paddingLeft: '1rem' }}>
        {todos.map((t) => (
          <li key={t.id} style={{ display: 'flex', gap: '.5rem', marginBottom: '.25rem' }}>
            <span style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', flex: 1 }}>
              {t.title}
            </span>
            <button onClick={() => toggle(t)}>{t.status === 'done' ? '↩' : '✓'}</button>
            <button onClick={() => del(t.id)}>🗑</button>
          </li>
        ))}
      </ul>
    </div>
  )
}