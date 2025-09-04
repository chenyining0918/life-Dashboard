import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type QA = {
  id: string
  question: string
  answer: string | null
  notes: string | null
  status: 'open' | 'resolved'
  created_at: string
  updated_at: string
}

export default function QAForm() {
  const [qas, setQas]   = useState<QA[]>([])
  const [question, setQuestion] = useState('')
  const [edit, setEdit] = useState<{ id:string; notes:string } | null>(null)

  /* 实时订阅：电脑端自动刷新 */
  useEffect(() => {
    const channel = supabase
      .channel('qa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qa' }, () => refresh())
      .subscribe()

    refresh()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function refresh() {
    const { data } = await supabase.from('qa').select('*').order('updated_at', { ascending: false })
    setQas(data ?? [])
  }

  async function add() {
    if (!question.trim()) return
    await supabase.from('qa').insert({ question })
    setQuestion('')
  }

  async function saveNotes(id:string, notes:string) {
    await supabase.from('qa').update({ notes }).eq('id', id)
    setEdit(null)
  }

  async function del(id:string) {
    if(!confirm('确定删除?')) return
    await supabase.from('qa').delete().eq('id', id)
  }

  return (
    <div className="card">
      <h2>Q&A（实时可编辑）</h2>
      <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="新问题..." />
      <button onClick={add}>添加</button>

      <ul style={{ listStyle:'none', padding:0 }}>
        {qas.map(q=>(
          <li key={q.id} style={{ border:'1px solid #ddd',margin:8,padding:8,borderRadius:4 }}>
            <strong>{q.question}</strong>
            <span style={{float:'right',fontSize:12,color:'#666'}}>
              {new Date(q.updated_at).toLocaleString()}
            </span>

            <br />
            <textarea
              value={edit?.id===q.id ? edit.notes : q.notes || ''}
              onChange={e=>{
                if(edit?.id===q.id) setEdit({...edit,notes:e.target.value})
              }}
              onFocus={()=>setEdit({id:q.id,notes:q.notes||''})}
              onBlur={()=>edit && saveNotes(edit.id,edit.notes)}
              placeholder="补充信息（实时保存）"
              style={{width:'100%',minHeight:40}}
            />

            <div style={{marginTop:6}}>
              <button onClick={()=>supabase.from('qa').update({status:'resolved'}).eq('id',q.id)}>
                {q.status==='open'?'标记已解决':'重新打开'}
              </button>
              <button onClick={()=>del(q.id)} style={{marginLeft:8}}>删除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}