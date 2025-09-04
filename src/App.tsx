// src/App.tsx
import { useState } from 'react'
import './styles/global.css'   // 全局变量 + 通用样式
import './styles/theme.css'    // 主题变量（暗黑/亮色）
import './App.css'             // 仅保留网格布局

/* 各业务组件 */
import TodoPanel from './components/TodoPanel'
import QAPanel from './components/QAPanel'
import TimeLogPanel from './components/TimeLogPanel'
import QuickNotes from './QuickNotes'

export default function App() {
  const [showNotes, setShowNotes] = useState(false)

  return (
  <>
    <div className="app-grid">
      <header>
        <h1>Dashboard</h1>
        <button onClick={() => setShowNotes(true)}>📝 Quick Notes</button>
      </header>

      <div className="content">
        <section className="todos"><TodoPanel /></section>
        <section className="qa"><QAPanel /></section>
        <section className="timelog"><TimeLogPanel /></section>
        {/* QuickNotes 按钮区留空即可，已通过 header 按钮弹层 */}
      </div>
    </div>

    {showNotes && <QuickNotes onClose={() => setShowNotes(false)} />}
  </>
)
}