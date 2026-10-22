import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, Circle, Clock3,
  Coffee, FileText, Flag, History as HistoryIcon, Inbox, Lightbulb, ListTodo,
  Menu, MoreHorizontal, Pause, Play, Plus, Sparkles, Target,
  Mic, Moon, Sun, TimerReset, Trash2, WandSparkles, X, Zap,
} from "lucide-react";

type View = "today" | "dump" | "checklist" | "tasks" | "focus" | "history";
type Priority = "Critical" | "High" | "Normal" | "Low";
type Task = {
  id: string; title: string; category: string; priority: Priority; minutes: number;
  deadline?: string; status: "Inbox" | "Ready" | "In progress" | "Completed" | "Deferred";
  subtasks: string[]; firstStep: string; source: "explicit" | "suggested"; needsClarification?: boolean; completedAt?: number;
};

type PlanBlock = { taskId: string; label: string; time: string; minutes: number; kind?: "break" };

const SAMPLE = "I have a physics assignment due tomorrow, a chemistry test on Friday, two biology chapters to finish this week, a message to send to my project team, groceries to buy, and my room to clean. I keep delaying physics because I don't know where to start. I have about two hours free today.";
const starterTasks: Task[] = [
  { id: "physics", title: "Start the physics assignment", category: "Study", priority: "Critical", minutes: 45, deadline: "Due tomorrow", status: "Ready", subtasks: ["Open the assignment brief", "List the questions", "Solve the first question"], firstStep: "Open the assignment brief and highlight what is being asked.", source: "explicit" },
  { id: "chemistry", title: "Revise organic chemistry", category: "Study", priority: "High", minutes: 35, deadline: "Test Friday", status: "Ready", subtasks: ["List topics to revise", "Review notes", "Do practice questions"], firstStep: "Write down the three topics that feel least familiar.", source: "explicit" },
  { id: "biology", title: "Finish two biology chapters", category: "Study", priority: "Normal", minutes: 50, deadline: "This week", status: "Inbox", subtasks: ["Choose a chapter", "Read and annotate", "Test recall"], firstStep: "Choose the chapter with the nearest lecture connection.", source: "explicit" },
  { id: "team", title: "Send the project team an update", category: "Work & projects", priority: "High", minutes: 10, status: "Ready", subtasks: ["Draft the update", "Attach the outline", "Send"], firstStep: "Open a blank message and write the one-sentence status.", source: "explicit" },
  { id: "groceries", title: "Buy groceries", category: "Errands", priority: "Low", minutes: 25, status: "Inbox", subtasks: ["Make a short list", "Pick up essentials"], firstStep: "Write down the five things you will actually cook this week.", source: "explicit" },
  { id: "room", title: "Reset the main room surfaces", category: "Personal", priority: "Low", minutes: 20, status: "Inbox", subtasks: ["Collect rubbish", "Clear the main surface"], firstStep: "Put a bag by the door and collect visible rubbish for five minutes.", source: "suggested" },
];

const demoTaskIds = new Set(starterTasks.map(task => task.id));

function load<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ } }

function extractTasks(text: string): Task[] {
  const phrases = text.split(/[\n,;•]+|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  if (!phrases.length) return [];
  return phrases.slice(0, 30).map((phrase, index) => ({
    id: `task-${Date.now()}-${index}`, title: phrase.replace(/^(?:[-*•]|\d+[.)])\s*/, "").replace(/^i have to\s+/i, "").replace(/^i need to\s+/i, "").replace(/^need to\s+/i, ""),
    category: /study|exam|test|assignment|chapter|revise|read/i.test(phrase) ? "Study" : /buy|clean|grocer|room|errand/i.test(phrase) ? "Personal" : "Work & projects",
    priority: /urgent|asap|today|tonight|tomorrow|due|deadline|overdue|by\s+\w|rent|bills?|pay|submit|important|doctor|interview|exam/i.test(phrase) ? "High" : /someday|maybe|eventually|organize|clean up|learn|read|watch|browse|later|when i can|no rush/i.test(phrase) ? "Low" : "Normal", minutes: 20,
    status: index === 0 ? "Ready" : "Inbox", subtasks: ["Define the smallest useful first step", "Set a short timer", "Mark it complete"],
    firstStep: "Write down the smallest visible action you can do in five minutes.", source: "explicit",
    deadline: phrase.match(/(?:due|by|on|for)\s+([^,]+)/i)?.[1]?.trim(),
    needsClarification: /assignment|exam|test|project|application/i.test(phrase) && !/(due|by|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/.-]\d{1,2})/i.test(phrase),
  }));
}

export default function Home() {
  const [view, setView] = useState<View>("today");
  const [tasks, setTasks] = useState<Task[]>(() => load<Task[]>("bdd-tasks", []).filter(task => !demoTaskIds.has(task.id)));
  const [dump, setDump] = useState(() => load("bdd-dump", ""));
  const [history, setHistory] = useState<string[]>(() => load("bdd-history", []));
  const [plan, setPlan] = useState<PlanBlock[]>(() => load("bdd-plan", []));
  const [available, setAvailable] = useState(120);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Normal");
  const [theme, setTheme] = useState<"light" | "dark">(() => load("bdd-theme", "light"));

  useEffect(() => save("bdd-tasks", tasks), [tasks]);
  useEffect(() => save("bdd-dump", dump), [dump]);
  useEffect(() => save("bdd-plan", plan), [plan]);
  useEffect(() => { if (history.length) save("bdd-history", history); }, [history]);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); save("bdd-theme", theme); }, [theme]);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000); return () => window.clearInterval(id); }, [running]);

  const completed = tasks.filter(t => t.status === "Completed").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const completedToday = tasks.filter(t => t.status === "Completed" && t.completedAt && t.completedAt >= startOfToday.getTime()).length;
  const todayProgress = tasks.length ? Math.round(completedToday / tasks.length * 100) : 0;
  const focusTask = tasks.find(t => t.id === focusId) ?? tasks.find(t => t.status !== "Completed");
  const readyTasks = tasks.filter(t => t.status !== "Completed").sort((a, b) => (a.priority === "Critical" ? -2 : a.priority === "High" ? -1 : 1) - (b.priority === "Critical" ? -2 : b.priority === "High" ? -1 : 1));
  const spotlightTask = readyTasks[spotlightIndex % Math.max(readyTasks.length, 1)];
  const categories = [...new Set(tasks.map(t => t.category))];
  useEffect(() => { if (readyTasks.length < 2) return; const id = window.setInterval(() => setSpotlightIndex(index => (index + 1) % readyTasks.length), 3000); return () => window.clearInterval(id); }, [readyTasks.length]);

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2800); }
  function maybeShowSignup() {
    const now = Date.now();
    const recent = load<number[]>("bdd-signup-prompts", []).filter(timestamp => now - timestamp < 30 * 60 * 1000);
    if (recent.length >= 2) return;
    save("bdd-signup-prompts", [...recent, now]);
    setShowSignup(true);
  }
  function toggleVoiceNote() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (listening) { recognitionRef.current?.stop(); return; }
    if (!SpeechRecognition) { flash("Voice notes are not supported in this browser. You can still type your thoughts here."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => { setListening(true); flash("I’m listening — speak freely about what’s on your mind."); };
    recognition.onresult = (event: any) => {
      let spoken = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) spoken += event.results[index][0].transcript;
      }
      if (spoken.trim()) setDump(current => `${current.trim()}${current.trim() ? " " : ""}${spoken.trim()}`);
    };
    recognition.onerror = () => { setListening(false); flash("I couldn’t catch that. Please try the voice note again or type instead."); };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
  }
  function loadSample() { setDump(SAMPLE); flash("Sample loaded — turn the noise into a plan."); }
  function processDump(mode: "plan" | "organize") {
    if (!dump.trim()) { flash("Add a few thoughts first — messy is completely fine."); return; }
    const next = extractTasks(dump); setTasks(next); setHistory(h => [dump, ...h].slice(0, 8)); maybeShowSignup();
    setView("checklist");
    flash("Your thoughts are now a checklist.");
  }
  function generatePlan(source = tasks) {
    const active = source.filter(t => t.status !== "Completed").sort((a, b) => (a.priority === "Critical" ? -2 : a.priority === "High" ? -1 : 1) - (b.priority === "Critical" ? -2 : b.priority === "High" ? -1 : 1));
    let elapsed = 0; const blocks: PlanBlock[] = [];
    for (const task of active) { if (elapsed + task.minutes > available) break; const start = 9 * 60 + elapsed; blocks.push({ taskId: task.id, label: task.title, time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`, minutes: task.minutes }); elapsed += task.minutes; if (elapsed < available && blocks.length % 2 === 0) { blocks.push({ taskId: `break-${blocks.length}`, label: "Short reset", time: `${String(Math.floor((9 * 60 + elapsed) / 60)).padStart(2, "0")}:${String((9 * 60 + elapsed) % 60).padStart(2, "0")}`, minutes: 5, kind: "break" }); elapsed += 5; } }
    setPlan(blocks); setView("today"); flash("A realistic plan is ready for the time you have.");
  }
  function toggleTask(id: string) { setTasks(ts => ts.map(t => t.id === id ? { ...t, status: t.status === "Completed" ? "Ready" : "Completed", completedAt: t.status === "Completed" ? undefined : Date.now() } : t)); }
  function makeEasier(id: string) { setTasks(ts => ts.map(t => t.id === id ? { ...t, subtasks: ["Open the relevant document", "Work for five focused minutes", "Write down what is still unclear", ...t.subtasks].slice(0, 5) } : t)); flash("The task is smaller now. Start with the first step."); }
  function startFocus(id: string) { setFocusId(id); setSeconds(25 * 60); setRunning(false); setView("focus"); }
  function updateTaskTitle(id: string, title: string) { setTasks(ts => ts.map(task => task.id === id ? { ...task, title } : task)); }
  function updateDeadline(id: string, deadline: string) { setTasks(ts => ts.map(task => task.id === id ? { ...task, deadline: deadline || undefined, needsClarification: !deadline } : task)); }
  function updatePriority(id: string, priority: Priority) { setTasks(ts => ts.map(task => task.id === id ? { ...task, priority } : task)); }
  function cyclePriority(id: string) { setTasks(ts => ts.map(task => { if (task.id !== id) return task; const current = task.priority === "Critical" ? "High" : task.priority; const next = current === "High" ? "Normal" : current === "Normal" ? "Low" : "High"; return { ...task, priority: next as Priority }; })); }
  function clearCompleted() { setTasks(ts => ts.filter(task => task.status !== "Completed")); }
  function startOver() { setTasks([]); setDump(""); setPlan([]); setFocusId(null); setView("dump"); flash("Everything is cleared. Start fresh when you’re ready."); }
  function addManualTask() { if (!newTaskTitle.trim()) { flash("Give the task a short title first."); return; } setTasks(ts => [{ id: `manual-${Date.now()}`, title: newTaskTitle.trim(), category: "Personal", priority: newTaskPriority, minutes: 20, status: "Ready", subtasks: ["Define the smallest useful first step"], firstStep: "Write down the smallest visible action you can do in five minutes.", source: "explicit" }, ...ts]); setNewTaskTitle(""); setNewTaskPriority("Normal"); setShowAddTask(false); flash("Task added to your bulletin."); }
  function deleteTask(id: string) { setTasks(ts => ts.filter(task => task.id !== id)); flash("Task removed."); }
  function formatTime(s: number) { return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

  const nav = [{ id: "today", label: "Today", icon: Target }, { id: "dump", label: "Brain Dump", icon: Inbox }, { id: "tasks", label: "My Tasks", icon: ListTodo }, { id: "focus", label: "Focus", icon: Zap }, { id: "history", label: "History", icon: HistoryIcon }];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand" onClick={() => setView("today")}><span className="brand-mark"><img src="/brain-logo-small.png" alt="Brain Dump → Done logo" /></span><span><strong>brain dump</strong><em>→ done</em></span></div>
      <div className="profile-card"><div className="profile-card-head"><div className="profile-avatar">AS</div><div><strong>Your profile</strong><span>Guest workspace</span></div></div><div className="profile-stats"><div><b>{todayProgress}%</b><span>Today</span></div><div><b>{progress}%</b><span>All time</span></div></div><button className="profile-signup" onClick={() => setShowSignup(true)}>Sign up to save <ArrowRight size={13} /></button></div>
      <div className="side-label">Your workspace</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => { setView(item.id as View); setMobileNav(false); }}><Icon size={17} /><span>{item.label}</span>{item.id === "tasks" && <small>{tasks.filter(t => t.status !== "Completed").length}</small>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="tiny-progress"><span>Your progress</span><b>{progress}%</b><div><i style={{ width: `${progress}%` }} /></div></div><button className="profile-link" onClick={() => flash("Your progress will be available in Profile when you sign up.")}><Target size={14} /> Profile & progress</button></div>
    </aside>
    {mobileNav && <button className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNav(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(v => !v)}><Menu size={20} /></button><div className="crumb">{view === "today" ? <img className="topbar-logo" src="/brain-logo-small.png" alt="Brain Dump → Done" /> : <span>{nav.find(n => n.id === view)?.label}</span>}</div><div className="top-actions"><div className="top-progress"><span>{completed}/{tasks.length} done</span><div><i style={{ width: `${progress}%` }} /></div></div><button className="theme-toggle" onClick={() => setTheme(current => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}<span>{theme === "light" ? "Dark" : "Light"}</span></button><button className="new-dump" onClick={() => { setDump(""); setView("dump"); }}><Plus size={16} /> New brain dump</button><button className="avatar" onClick={() => flash("Sign up to keep your progress across devices.")}>AS</button></div></header>
      {showSignup && <div className="signup-popover"><div className="signup-popover-icon"><Sparkles size={16} /></div><div><strong>Keep your progress safe</strong><p>Sign up so your tasks and plans don’t disappear when you switch devices.</p><div className="signup-actions"><button className="button small primary" onClick={() => flash("Sign-up is ready when you are.")}>Sign up</button><button onClick={() => setShowSignup(false)}>Not now</button></div></div><button className="signup-close" onClick={() => setShowSignup(false)}><X size={14} /></button></div>}
      {notice && <div className="toast"><Sparkles size={16} /> {notice}</div>}
      <div className="page-wrap">
        {view === "checklist" && <PriorityChecklist tasks={tasks} completed={completed} onToggle={toggleTask} onCyclePriority={cyclePriority} onDelete={deleteTask} onClearCompleted={clearCompleted} onStartOver={startOver} />}
        {view === "today" && <>
          <section className="hero-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> A clearer start</div><h1>Make room for<br /><span>what matters next.</span></h1><p className="hero-copy">Put the busy thoughts somewhere kinder. We’ll help you find the most important next step.</p><div className="hero-actions"><button className="button primary" onClick={() => setView("dump")}>Clear my head <ArrowRight size={17} /></button><button className="button text-button" onClick={loadSample}>Explore an example <ChevronRightIcon /></button></div></div><div className="hero-note"><div className="note-top"><span>your north star</span><MoreHorizontal size={16} /></div><div className="note-icon"><Lightbulb size={19} /></div><p>“You don’t need to finish everything. You just need a clear next step.”</p><span className="note-line" /></div></section>
          <section className="section-head"><div><span className="section-kicker">A little clarity</span><h2>Here’s your day at a glance</h2></div><button className="quiet-button" onClick={() => generatePlan()}>Replan <WandSparkles size={15} /></button></section>
          <div className="stat-grid"><div className="stat-card sage"><span>Progress today</span><strong>{progress}%</strong><div className="stat-line"><i style={{ width: `${progress}%` }} /></div><small>{completed === 0 ? "A blank page is a beginning." : `${completed} meaningful step${completed === 1 ? "" : "s"} complete`}</small></div><div className="stat-card peach"><span>Time available</span><strong>{Math.floor(available / 60)}h {available % 60 ? `${available % 60}m` : ""}</strong><small>Enough for one important thing + a reset</small><div className="stat-icon"><Clock3 size={18} /></div></div><div className="stat-card white"><span>In your way</span><strong>{tasks.filter(t => t.status !== "Completed").length}</strong><small>tasks, sorted by what helps most</small><div className="stat-icon forest"><Flag size={17} /></div></div></div>
          <PriorityBulletin tasks={tasks} completed={completed} showAddTask={showAddTask} setShowAddTask={setShowAddTask} newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle} newTaskPriority={newTaskPriority} setNewTaskPriority={setNewTaskPriority} onAdd={addManualTask} onToggle={toggleTask} onPriority={updatePriority} onDelete={deleteTask} /><div className="content-grid"><section className="plan-card"><div className="card-head"><div><span className="section-kicker">Your next best moves</span><h3>Today’s plan</h3></div><button className="more-button" onClick={() => setAvailable(a => a === 120 ? 60 : 120)}>{available === 120 ? "2h window" : "1h window"} <ChevronDown size={15} /></button></div>{plan.length ? <div className="timeline">{plan.map(block => <div className={`timeline-row ${block.kind === "break" ? "break-row" : ""}`} key={block.taskId}><time>{block.time}</time><div className="timeline-dot">{block.kind === "break" ? <Coffee size={13} /> : <span />}</div><div className="timeline-copy"><strong>{block.label}</strong><small>{block.kind === "break" ? "Breathe, stretch, refill" : `${block.minutes} min · ${tasks.find(t => t.id === block.taskId)?.firstStep ?? "One small step"}`}</small></div>{block.kind !== "break" && <button className="row-action" onClick={() => startFocus(block.taskId)}><Play size={14} /></button>}</div>)}</div> : <div className="empty-plan"><div className="empty-icon"><TimerReset size={22} /></div><div><strong>Your plan is waiting for your own first task.</strong><p>Write down what’s on your mind and we’ll sort it into a calm sequence.</p></div><button className="button small primary" onClick={() => setView("dump")}>Start a brain dump <ArrowRight size={14} /></button></div>}</section><aside className="side-stack"><div className="next-card"><div className="card-head"><span className="section-kicker">Do this first</span><span className="priority-dot" /></div>{spotlightTask ? <><input className="spotlight-input" value={spotlightTask.title} onChange={event => updateTaskTitle(spotlightTask.id, event.target.value)} aria-label="Edit recommended task" /><p>{spotlightTask.firstStep}</p><small className="rotation-note">Rotates every few seconds · highest priority first</small><button className="button dark full" onClick={() => startFocus(spotlightTask.id)}>Start a focus session <Play size={15} /></button></> : <><h3>Add your first task</h3><p>Tell us what’s taking up space in your head and we’ll recommend what to do first.</p><button className="button dark full" onClick={() => setView("dump")}>Add a brain dump <ArrowRight size={15} /></button></>}</div><div className="quote-card"><span className="quote-mark">“</span><p>Small starts are still starts.</p><span>— your reminder</span></div></aside></div>
        </>}
        {view === "dump" && <section className="dump-page"><div className="dump-heading"><div className="eyebrow"><span className="eyebrow-dot peach-dot" /> No sorting required</div><h1>What’s taking up<br /><span>space in your head?</span></h1><p>Don’t organize it. Don’t make it sound neat.<br />Just get it all out. We’ll help with the next part.</p></div><div className="editor-card"><div className="editor-toolbar"><span><FileText size={15} /> brain dump / untitled</span><span>{dump.trim() ? `${dump.trim().split(/\s+/).length} words` : "0 words"}</span></div><textarea autoFocus value={dump} onChange={e => setDump(e.target.value)} placeholder="Assignments, deadlines, ideas, errands, things you’ve been avoiding… Put everything here." /><div className="editor-foot"><button className="text-button" onClick={loadSample}><Sparkles size={15} /> Load a sample</button><div className="editor-tools"><button className={`voice-button ${listening ? "listening" : ""}`} onClick={toggleVoiceNote}><Mic size={15} /> {listening ? "Listening… tap to stop" : "Speak instead"}</button><button className="text-button muted" onClick={() => setDump("")}><X size={15} /> Clear</button></div></div></div><div className="dump-options"><div><span className="section-kicker">Optional context</span><h3>Shape the plan around your day.</h3></div><div className="option-pills"><button className={available === 120 ? "selected" : ""} onClick={() => setAvailable(120)}>2 hours free</button><button className={available === 60 ? "selected" : ""} onClick={() => setAvailable(60)}>1 hour free</button><button onClick={() => flash("Energy level noted — we’ll keep the first step light.")}>Low energy today</button></div></div><div className="dump-actions"><button className="button primary clear-head-submit" onClick={() => processDump("organize")}>Clear my head <ArrowRight size={17} /></button></div></section>}
        {view === "tasks" && <section><div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> The full picture</span><h1>Your brain dump,<br /><span>sorted.</span></h1><p>Here’s what matters, what can wait, and where to start.</p></div><button className="button primary" onClick={() => setView("dump")}><Plus size={16} /> Add task</button></div><div className="task-summary"><div><strong>{tasks.length}</strong><span>tasks found</span></div><div><strong>{tasks.filter(t => t.priority === "High" || t.priority === "Critical").length}</strong><span>need attention</span></div><div><strong>{Math.round(tasks.reduce((a, t) => a + t.minutes, 0) / 60)}h</strong><span>estimated work</span></div><div className="why-order"><Zap size={16} /><span><b>Why this order?</b> Deadlines first, then quick wins that remove a blocker.</span></div></div>{tasks.some(task => task.needsClarification) && <div className="clarification-banner"><Flag size={16} /><span><strong>One quick question before we prioritize.</strong> A few tasks need a due time so we don’t guess what matters most.</span></div>}<div className="category-grid">{categories.map(cat => <div className="category-column" key={cat}><div className="category-title"><span>{cat}</span><b>{tasks.filter(t => t.category === cat && t.status !== "Completed").length}</b></div>{tasks.filter(t => t.category === cat).map(task => <TaskCard key={task.id} task={task} expanded={expanded === task.id} onExpand={() => setExpanded(expanded === task.id ? null : task.id)} onToggle={() => toggleTask(task.id)} onFocus={() => startFocus(task.id)} onEasier={() => makeEasier(task.id)} onDelete={() => setTasks(ts => ts.filter(t => t.id !== task.id))} onDeadline={deadline => updateDeadline(task.id, deadline)} />)}</div>)}</div></section>}
        {view === "focus" && <section className="focus-page"><div className="focus-back" onClick={() => setView("today")}><ChevronLeft size={16} /> Back to today</div><div className="focus-layout"><div className="focus-copy"><span className="eyebrow"><span className="eyebrow-dot peach-dot" /> One thing at a time</span><h1>Make the next<br /><span>25 minutes count.</span></h1><p>You’re working on <strong>{focusTask?.title ?? "a meaningful task"}</strong>. No need to solve the whole thing right now.</p><div className="focus-step"><span>Start here</span><strong>{focusTask?.firstStep ?? "Choose one small action."}</strong></div><div className="focus-controls"><button className="button dark" onClick={() => setRunning(v => !v)}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? "Pause timer" : "Start timer"}</button><button className="button outline" onClick={() => { if (focusTask) toggleTask(focusTask.id); setView("today"); flash("Nice work — progress updated."); }}>Mark complete <Check size={16} /></button></div></div><div className="timer-card"><div className="timer-ring"><div><span>{formatTime(seconds)}</span><small>{running ? "in progress" : "ready when you are"}</small></div></div><div className="timer-footer"><span><Coffee size={15} /> Short focus sprint</span><button onClick={() => { setSeconds(25 * 60); setRunning(false); }}><TimerReset size={15} /> Reset</button></div></div></div></section>}
        {view === "history" && <section><div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> Your thinking, kept</span><h1>A little proof<br /><span>you’re moving.</span></h1><p>Past brain dumps and plans stay here so you can pick up the thread.</p></div></div><div className="history-list">{history.length ? history.map((item, i) => <div className="history-item" key={`${item}-${i}`}><div className="history-icon"><FileText size={17} /></div><div><strong>{item.slice(0, 70)}{item.length > 70 ? "…" : ""}</strong><span>Brain dump · {i === 0 ? "Most recent" : `${i} days ago`}</span></div><button className="row-action" onClick={() => { setDump(item); setView("dump"); }}><ArrowRight size={16} /></button></div>) : <div className="history-empty"><HistoryIcon size={28} /><h3>Your history starts with the first brain dump.</h3><button className="button primary" onClick={() => setView("dump")}>Clear my head <ArrowRight size={16} /></button></div>}</div></section>}
      </div>
    </main>
  </div>;
}

function ChevronRightIcon() { return <ArrowRight size={15} />; }
function PriorityChecklist({ tasks, completed, onToggle, onCyclePriority, onDelete, onClearCompleted, onStartOver }: { tasks: Task[]; completed: number; onToggle: (id: string) => void; onCyclePriority: (id: string) => void; onDelete: (id: string) => void; onClearCompleted: () => void; onStartOver: () => void }) {
  const groups: { label: string; tone: string; priorities: Priority[] }[] = [
    { label: "High priority", tone: "high-group", priorities: ["Critical", "High"] },
    { label: "Medium priority", tone: "medium-group", priorities: ["Normal"] },
    { label: "Low priority", tone: "low-group", priorities: ["Low"] },
  ];
  const ordered = (groupTasks: Task[]) => groupTasks.slice().sort((a, b) => Number(a.status === "Completed") - Number(b.status === "Completed"));
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  return <section className="clear-head-results"><div className="clear-head-top"><div><span className="eyebrow"><span className="eyebrow-dot" /> Clear my head</span><h1>Your thoughts,<br /><span>made clear.</span></h1></div><button className="button outline" onClick={() => onStartOver()}>Start over</button></div><div className="checklist-progress"><div><strong>{completed} of {tasks.length} done</strong><span>{tasks.length && completed === tasks.length ? "All clear 🎉" : "Keep going"}</span></div><div className="checklist-progress-bar"><i style={{ width: `${progress}%` }} /></div></div>{tasks.length ? <div className="clear-head-groups">{groups.map(group => { const groupTasks = ordered(tasks.filter(task => group.priorities.includes(task.priority))); return <section className={`clear-priority-group ${group.tone}`} key={group.label}><h2><span className="group-dot" />{group.label}<b>{groupTasks.length}</b></h2>{groupTasks.length ? groupTasks.map(task => <div className={`clear-task-row ${task.status === "Completed" ? "done" : ""}`} key={task.id}><button className="clear-check" onClick={() => onToggle(task.id)} aria-label={`${task.status === "Completed" ? "Untick" : "Tick off"} ${task.title}`}>{task.status === "Completed" ? <CheckCircle2 size={23} /> : <Circle size={23} />}</button><span className="clear-task-title">{task.title}</span><button className="clear-priority-tag" onClick={() => onCyclePriority(task.id)} aria-label={`Change priority for ${task.title}`}>{task.priority === "Normal" ? "Medium" : task.priority}</button><button className="clear-delete" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}><X size={20} /></button></div>) : <div className="clear-group-empty">No tasks here.</div>}</section>; })}</div> : <div className="clear-empty-state"><ListTodo size={28} /><h2>Your checklist is empty.</h2><p>Start over to return to the brain dump and add what’s on your mind.</p><button className="button primary" onClick={() => onStartOver()}>Start over</button></div>}<div className="clear-bottom-actions"><button className="button outline" disabled={!completed} onClick={onClearCompleted}>Clear completed</button><button className="button outline" onClick={onStartOver}>Start over</button></div></section>;
}
function PriorityBulletin({ tasks, completed, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, newTaskPriority, setNewTaskPriority, onAdd, onToggle, onPriority, onDelete }: { tasks: Task[]; completed: number; showAddTask: boolean; setShowAddTask: (value: boolean) => void; newTaskTitle: string; setNewTaskTitle: (value: string) => void; newTaskPriority: Priority; setNewTaskPriority: (value: Priority) => void; onAdd: () => void; onToggle: (id: string) => void; onPriority: (id: string, priority: Priority) => void; onDelete: (id: string) => void }) {
  const groups: { label: string; tone: string; priorities: Priority[] }[] = [
    { label: "HIGH PRIORITY", tone: "high-group", priorities: ["Critical", "High"] },
    { label: "MEDIUM PRIORITY", tone: "medium-group", priorities: ["Normal"] },
    { label: "LOW PRIORITY", tone: "low-group", priorities: ["Low"] },
  ];
  return <section className="bulletin-card"><div className="card-head"><div><span className="section-kicker">Your bulletin</span><h3>Everything out in the open</h3></div><div className="bulletin-tools"><span className="bulletin-count">{completed}/{tasks.length} complete</span><button className="quiet-button" onClick={() => setShowAddTask(!showAddTask)}><Plus size={14} /> Add task</button></div></div>{showAddTask && <div className="add-task-row"><input autoFocus value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter") onAdd(); }} placeholder="What needs doing?" /><select value={newTaskPriority} onChange={event => setNewTaskPriority(event.target.value as Priority)}><option value="High">High</option><option value="Normal">Medium</option><option value="Low">Low</option></select><button className="button small primary" onClick={onAdd}>Add</button></div>}{tasks.length ? <div className="priority-groups">{groups.map(group => { const groupTasks = tasks.filter(task => group.priorities.includes(task.priority)); return <div className={`priority-group ${group.tone}`} key={group.label}><div className="priority-group-title"><span>{group.label}</span><b>{groupTasks.length}</b></div>{groupTasks.length ? groupTasks.map(task => <div className={`bulletin-item ${task.status === "Completed" ? "done" : ""}`} key={task.id}><button className="bulletin-check" onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.status === "Completed" ? "active" : "complete"}`}>{task.status === "Completed" ? <CheckCircle2 size={19} /> : <Circle size={19} />}</button><span className="bulletin-title">{task.title}</span><select className="priority-select" value={task.priority} onChange={event => onPriority(task.id, event.target.value as Priority)} aria-label={`Priority for ${task.title}`}><option value="Critical">Critical</option><option value="High">High</option><option value="Normal">Medium</option><option value="Low">Low</option></select>{task.deadline && <small>{task.deadline}</small>}<button className="bulletin-delete" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button></div>) : <div className="priority-empty">No tasks in this group yet.</div>}</div>; })}</div> : <div className="bulletin-empty"><ListTodo size={18} /> Your extracted tasks will appear here as a priority checklist.</div>}</section>;
}
function TaskCard({ task, expanded, onExpand, onToggle, onFocus, onEasier, onDelete, onDeadline }: { task: Task; expanded: boolean; onExpand: () => void; onToggle: () => void; onFocus: () => void; onEasier: () => void; onDelete: () => void; onDeadline: (deadline: string) => void }) {
  return <article className={`task-card ${task.status === "Completed" ? "completed" : ""}`}><div className="task-main"><button className="check-button" onClick={onToggle}>{task.status === "Completed" ? <CheckCircle2 size={19} /> : <Circle size={19} />}</button><div className="task-content" onClick={onExpand}><div className="task-title-row"><h3>{task.title}</h3><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div><div className="task-meta"><span><Clock3 size={13} /> {task.minutes} min</span>{task.deadline && <span><Flag size={13} /> {task.deadline}</span>}<span className="source-tag">{task.source === "suggested" ? "suggested" : "from your note"}</span></div></div><button className="chevron-button" onClick={onExpand}>{expanded ? <ChevronDown size={17} /> : <ArrowRight size={16} />}</button></div>{expanded && <div className="task-detail">{task.needsClarification && <div className="clarify-card"><strong>When is this due?</strong><span>You mentioned an assignment, test, or project but not the due time. Add a date or say “no deadline” so we can prioritize it fairly.</span><input type="text" placeholder="e.g. Friday at 5pm or next week" onBlur={event => onDeadline(event.currentTarget.value)} /></div>}<div className="first-step"><span>Best first step</span><p>{task.firstStep}</p></div><div className="subtasks">{task.subtasks.map((sub, i) => <div key={`${sub}-${i}`}><span>{i + 1}</span>{sub}</div>)}</div><div className="task-actions"><button onClick={onFocus}><Play size={14} /> Focus</button><button onClick={onEasier}><WandSparkles size={14} /> Make this easier</button><button className="delete" onClick={onDelete}><Trash2 size={14} /> Delete</button></div></div>}</article>;
}
