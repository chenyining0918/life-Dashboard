import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Pause = { from: string; to?: string };
type Log = {
  id: string;
  label: string;
  start_at: string;
  end_at: string | null;
  pauses: Pause[];
  updated_at: string;
};

export default function TimeLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [label, setLabel] = useState('');

  /* 实时订阅 */
  useEffect(() => {
    const channel = supabase
      .channel('time_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, refresh)
      .subscribe();

    refresh();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function refresh() {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .order('start_at', { ascending: false });
    if (!error) setLogs(data || []);
  }

  /* 新增任务 */
  async function start() {
    if (!label.trim()) return;
    await supabase.from('time_logs').insert({
    label,
    pauses: [],          // ← 直接数组
    start_at: new Date().toISOString()
  });
  }

  /* 暂停 / 继续 / 结束 全部在前端算好再写回 */
  async function pause(id: string) {
    const log = logs.find((l) => l.id === id);
    if (!log) return;

    const newPauses = [...log.pauses, { from: new Date().toISOString() }];
    const { error } = await supabase
      .from('time_logs')
      .update({ pauses: newPauses })   // 这里直接传数组
      .eq('id', id);

    if (error) console.error('pause error', error);
    else refresh();
  }

  async function resume(id: string) {
    const log = logs.find((l) => l.id === id);
    if (!log) return;

    const pauses = [...log.pauses];
    const last = pauses[pauses.length - 1];
    if (last && !last.to) {
      last.to = new Date().toISOString();
    }
    const { error } = await supabase
      .from('time_logs')
      .update({ pauses })
      .eq('id', id);

    if (error) console.error('resume error', error);
    else refresh();
  }

  async function finish(id: string) {
    const log = logs.find((l) => l.id === id);
    if (!log) return;

    const pauses = [...log.pauses];
    const last = pauses[pauses.length - 1];
    if (last && !last.to) last.to = new Date().toISOString();

    const { error } = await supabase
      .from('time_logs')
      .update({
        end_at: new Date().toISOString(),
        pauses:pauses,
      })
      .eq('id', id);

    if (error) console.error('finish error', error);
    else refresh();
  }

  async function del(id: string) {
    if (!window.confirm('确定删除?')) return;
    await supabase.from('time_logs').delete().eq('id', id);
  }

  /* 计算已用秒数（运行中则实时跳动） */
  const elapsedSeconds = (log: Log) => {
    const now = Date.now();
    let total = log.end_at ? 0 : now - new Date(log.start_at).getTime();
    log.pauses.forEach((p) => {
      const from = new Date(p.from).getTime();
      const to = p.to ? new Date(p.to).getTime() : now;
      total -= to - from;
    });
    return Math.floor(total / 1000);
  };

  /* 格式化 */
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="card">
      <h2>时间任务</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="任务名称"
        />
        <button onClick={start}>开始</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>
        {logs.map((log) => {
          const sec = elapsedSeconds(log);
          const running = !log.end_at && !log.pauses.some((p) => !p.to);
          const paused = !log.end_at && !running;

          return (
            <li
              key={log.id}
              style={{
                border: '1px solid #ddd',
                padding: 12,
                marginBottom: 8,
                borderRadius: 4,
              }}
            >
              <strong>{log.label}</strong>
              <div style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>
                开始：{new Date(log.start_at).toLocaleString()}
                {log.end_at && <> · 结束：{new Date(log.end_at).toLocaleString()}</>}
              </div>
              <div>已用：{fmt(sec)}</div>

              <div style={{ marginTop: 6 }}>
                {running && (
                  <>
                    <button onClick={() => pause(log.id)}>暂停</button>
                    <button onClick={() => finish(log.id)} style={{ marginLeft: 4 }}>结束</button>
                  </>
                )}
                {paused && (
                  <>
                    <button onClick={() => resume(log.id)}>继续</button>
                    <button onClick={() => finish(log.id)} style={{ marginLeft: 4 }}>结束</button>
                  </>
                )}
                {log.end_at && <span style={{ color: 'green' }}>✅ 已完成</span>}
                <button onClick={() => del(log.id)} style={{ marginLeft: 8 }}>删除</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}