// src/pages/Landing.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  Brain, BookOpen, TrendingUp, FileText, Search, Bell,
  Cloud, Smartphone, CheckCircle, ChevronDown, ChevronRight,
  Sparkles, Star, Shield, Zap, Users, Award, ArrowRight,
  ClipboardList, Timer, Download, Monitor, Apple, Lock,
} from 'lucide-react';

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, className = '', id = '' }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`px-5 py-16 max-w-2xl mx-auto ${className}`}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-4 h-px bg-green-500" />
      <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">{children}</span>
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'What is StudiByte?', a: 'StudiByte is an AI-powered academic companion designed for students. It combines a smart timetable, GPA tracker, study timer, assignment manager, course material storage, and an AI study assistant — all in one mobile-first app.' },
  { q: 'Is StudiByte free to use?', a: 'Yes. StudiByte offers a free tier that includes core features like timetable management, attendance tracking, GPA calculation, and basic AI assistance. Premium features are available for students who need more.' },
  { q: 'How does the AI Study Assistant work?', a: 'The AI assistant is powered by Google Gemini. You can ask it questions about any subject, request summaries, get help understanding difficult concepts, or ask it to generate practice questions from your notes.' },
  { q: 'Does StudiByte support my school\'s grading scale?', a: 'Yes. StudiByte supports 3.0, 4.0, and 5.0 CGPA scales. You select your school\'s scale during setup and all GPA calculations automatically use the correct maximum.' },
  { q: 'Can I upload my course materials?', a: 'Yes. You can upload PDFs, images, Word documents, and other study files. Materials are stored securely and linked to the relevant course and semester so you can find them easily.' },
  { q: 'How does attendance tracking work?', a: 'For each class on your timetable, you mark whether you attended or missed it. StudiByte calculates your attendance percentage per course and alerts you when you\'re approaching your target threshold.' },
  { q: 'Will StudiByte remind me about classes?', a: 'Yes. StudiByte sends push notifications before your classes start — 10 minutes, 30 minutes, or 1 hour before, depending on your preferences. Reminders only fire for classes scheduled for that day.' },
  { q: 'Can I track assignments and deadlines?', a: 'Yes. The assignments manager lets you add tasks with deadlines, priority levels, and course links. You can mark assignments as complete and filter by urgency so nothing slips through.' },
  { q: 'Is my data safe and private?', a: 'All data is stored securely in Firebase with authentication required to access it. Your academic data is private to your account and is never shared with third parties or used for advertising.' },
  { q: 'Does it work offline?', a: 'StudiByte uses Firestore\'s offline persistence, so you can view your timetable, GPA, and assignments even without an internet connection. Changes sync automatically when you reconnect.' },
  { q: 'Can I install StudiByte on my phone?', a: 'Yes. StudiByte is a Progressive Web App (PWA). On Android, tap "Add to Home Screen" in Chrome. On iPhone, use Safari\'s Share button and select "Add to Home Screen". It installs like a native app.' },
  { q: 'Can I use StudiByte on a laptop or desktop?', a: 'Yes. StudiByte works in any modern browser. You can also install it as a desktop app via Chrome or Edge by clicking the install icon in the address bar.' },
  { q: 'What subjects does the AI assistant support?', a: 'The AI assistant covers all academic subjects — sciences, mathematics, engineering, business, law, arts, and humanities. If you can phrase a question, StudiByte AI can help you work through it.' },
  { q: 'Can I use StudiByte for multiple semesters?', a: 'Yes. StudiByte organises all data by semester and academic year. You can switch between semesters to review past GPA, attendance records, or course materials without losing anything.' },
  { q: 'Can the AI assistant do my assignments or exams for me?', a: 'No — and you shouldn\'t want it to. StudiByte AI is designed to help you understand material, not produce work you submit as your own. It explains concepts, summarises notes, and generates practice questions, but using it to write graded assignments directly would undermine the point of being in school. Always check anything important against your lecture notes or textbook, since AI responses can occasionally be incomplete or wrong.' },
  { q: 'Does StudiByte teach me how to study, or just track my data?', a: 'Both. Beyond timetables and GPA tracking, StudiByte includes a Study Tips section covering techniques like active recall, spaced repetition, and structured exam preparation — genuine study methods backed by research, not just productivity features.' },
  { q: 'How does StudiByte help with exam preparation specifically?', a: 'You can ask the AI assistant to generate practice questions on any topic, track which courses need the most attention based on your current GPA, and follow the spaced repetition approach covered in the Study Tips section to review material in short sessions instead of cramming.' },
  { q: 'Will StudiByte work for international or non-Nigerian universities?', a: 'Yes. StudiByte\'s academic level system supports year-based programmes (Year 1 through Year 4), foundation years, and certificate or diploma-level study, alongside 3.0, 4.0, and 5.0 CGPA scales — so it adapts to most university and college systems, not just one country\'s grading structure.' },
  { q: 'Is StudiByte only useful once I\'m already behind, or is it meant for everyday use?', a: 'It\'s built for everyday use. Most value comes from building your timetable and logging attendance and assignments as they happen, rather than reconstructing a semester\'s worth of information right before exams. Used consistently, it removes the need for a last-minute scramble in the first place.' },
  { q: 'How do I get started?', a: 'Create a free account using your email address. After signing up, you\'ll go through a brief setup to enter your department, academic level, and CGPA scale. Your timetable and other features are ready to use immediately.' },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="border-b border-white/6"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-3 touch-manipulation"
      >
        <span className="text-sm font-semibold text-white font-body leading-snug">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
          <ChevronDown size={15} className="text-dark-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-dark-400 font-body leading-relaxed pr-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, color, delay = 0,
}: { icon: any; title: string; desc: string; color: string; delay?: number }) {
  return (
    <motion.div
      className="p-5 rounded-2xl border border-white/6 bg-dark-900/60"
      style={{ backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <h3 className="text-sm font-bold text-white mb-2 font-display">{title}</h3>
      <p className="text-xs text-dark-400 font-body leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ── Problem card ──────────────────────────────────────────────────────────────
function ProblemCard({ emoji, title, desc, delay = 0 }: { emoji: string; title: string; desc: string; delay?: number }) {
  return (
    <motion.div
      className="flex gap-3 p-4 rounded-2xl bg-dark-900/50 border border-white/5"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
      <div>
        <p className="text-sm font-bold text-white font-display mb-0.5">{title}</p>
        <p className="text-xs text-dark-400 font-body leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Why card ──────────────────────────────────────────────────────────────────
function WhyCard({ icon: Icon, title, desc, color, delay = 0 }: { icon: any; title: string; desc: string; color: string; delay?: number }) {
  return (
    <motion.div
      className="flex gap-3 items-start"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <p className="text-sm font-bold text-white font-display mb-0.5">{title}</p>
        <p className="text-xs text-dark-400 font-body leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const distFromBottom =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      setShowScrollBtn(distFromBottom > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div className="min-h-screen bg-dark-950 overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
        style={{ background: 'rgba(5,8,10,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
            <Sparkles size={13} className="text-dark-950" />
          </div>
          <span className="text-sm font-black text-white font-display tracking-tight">StudiByte</span>
        </div>
        <button
          onClick={onGetStarted}
          className="text-xs font-bold text-dark-950 bg-green-500 px-4 py-2 rounded-xl touch-manipulation active:scale-95 transition-transform"
        >
          Get Started
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center px-5 pt-24 pb-16 max-w-2xl mx-auto overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }} />
        <div className="absolute bottom-0 -left-20 w-56 h-56 rounded-full opacity-8 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Sparkles size={11} className="text-green-400" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">AI-Powered • Free to Start</span>
          </div>
        </motion.div>

        <motion.h1
          className="text-[2.4rem] font-black text-white leading-[1.1] mb-4 font-display"
          style={{ letterSpacing: '-1.5px' }}
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
        >
          Study smarter.<br />
          <span className="text-green-400">Track everything.</span><br />
          Graduate stronger.
        </motion.h1>

        <motion.p
          className="text-sm text-dark-300 font-body leading-relaxed mb-8 max-w-sm"
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
        >
          StudiByte is the all-in-one academic platform that combines AI tutoring, CGPA tracking, timetable management, assignment reminders, and course materials — built specifically for university students.
        </motion.p>

        <motion.p
          className="text-sm text-dark-300 font-body leading-relaxed mb-8"
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
        >
          StudiByte is an AI-powered study planner and student productivity app built for university and college students who are tired of juggling five different tools just to stay on top of their academic life. Whether you're in your first year or finishing your final project, StudiByte brings your timetable, course materials, assignments, and grades into one organised workspace — so nothing falls through the cracks.
          <br /><br />
          At its core, StudiByte solves the problems every student knows too well: forgotten deadlines, a CGPA you only discover at the worst possible time, notes scattered across chats and folders, and difficult topics with no one around to explain them at midnight. The built-in CGPA calculator works out your grade point average instantly on your school's own scale, the assignment tracker keeps every deadline visible until it's done, and the student notes app gives your study materials a permanent, searchable home by course and semester.
          <br /><br />
          As a university study planner, StudiByte also helps you plan ahead rather than react — mapping out classes, study sessions, and exam preparation well before a test, instead of scrambling the night before. And when a concept just won't click, the built-in AI Study Assistant explains it in plain language, generates practice questions, and helps you revise faster, any time you need it.
        </motion.p>

        <motion.div className="flex flex-col gap-3 max-w-xs" variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-dark-950 touch-manipulation active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            Start for Free <ArrowRight size={15} />
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-dark-300 border border-white/10 touch-manipulation"
          >
            See what's inside <ChevronDown size={14} />
          </button>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          className="flex gap-3 mt-10"
          variants={fadeUp} initial="hidden" animate="visible" custom={4}
        >
          {[
            { label: 'Features', value: '10+' },
            { label: 'GPA Scales', value: '3.0 – 5.0' },
            { label: 'AI Powered', value: '✓' },
          ].map(s => (
            <div key={s.label} className="px-3 py-2 rounded-xl bg-dark-800/60 border border-white/6 text-center">
              <p className="text-sm font-black text-white font-display">{s.value}</p>
              <p className="text-[9px] text-dark-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── STUDENT PROBLEMS ────────────────────────────────────────────── */}
      <Section id="problems">
        <SectionLabel>The Struggle Is Real</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Every student faces these.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          University life is overwhelming. StudiByte was built to solve the exact problems students face every semester.
        </motion.p>
        <div className="space-y-3">
          {[
            { emoji: '😰', title: 'Missing important deadlines', desc: 'Deadlines get announced once in a lecture, buried in a WhatsApp group, or pinned to a notice board you walk past — then forgotten. The result is late submissions, lost marks, and last-minute panic that could have been avoided. StudiByte\'s assignment tracker keeps every deadline in one visible list with priority levels and reminders, so nothing slips through the cracks.', delay: 0 },
            { emoji: '📉', title: 'Not knowing your CGPA', desc: 'Most schools only release official results at the end of the semester, so students go months without knowing where they really stand — by which point a weak grade is already locked in with no time left to recover. StudiByte\'s CGPA calculator updates the moment you enter a score, using your school\'s exact grading scale, so you always know your real GPA in time to act on it.', delay: 0.06 },
            { emoji: '📂', title: 'Disorganised course materials', desc: 'Lecture slides end up in one chat, scanned notes in another, and past questions on a friend\'s phone you can never quite track down when exam week arrives. Searching for the right file under pressure wastes time you don\'t have. StudiByte\'s student notes app stores every PDF, image, and document by course and semester, so your entire library is organised and searchable in seconds.', delay: 0.12 },
            { emoji: '😴', title: 'Poor attendance tracking', desc: 'Attendance rules are strict but rarely tracked in real time, so many students don\'t realise they\'re close to the limit until they\'re barred from an exam or lose participation marks. StudiByte logs attendance for every class as it happens and calculates your percentage automatically, warning you before you cross the threshold — not after the damage is done.', delay: 0.18 },
            { emoji: '🤯', title: 'No one to explain difficult concepts', desc: 'You\'re stuck on a concept at midnight, the lecturer isn\'t reachable, and a search engine returns a dozen conflicting explanations instead of a straight answer. That gap is exactly where students lose momentum and confidence. StudiByte\'s AI Study Assistant explains any topic in plain language, works through examples with you, and is available any time you actually need help — not just during office hours.', delay: 0.24 },
          ].map(p => <ProblemCard key={p.title} {...p} />)}
        </div>
      </Section>

      {/* ── HOW STUDIBYTE HELPS ──────────────────────────────────────────── */}
      <Section>
        <SectionLabel>The Solution</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          One app. Every problem solved.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          StudiByte replaces five different apps with one academic platform that actually understands how university works.
        </motion.p>
        <div className="space-y-4">
          {[
            { step: '01', title: 'Build your timetable once', desc: 'Start by adding your courses, lecture times, venues, lecturers, and credit units just once. StudiByte stores everything in one structured weekly view, so you can see exactly what\'s coming up today without scrolling through messages or paper timetables. Whenever your schedule changes — a new elective, a venue switch, a rescheduled class — you update it in seconds and every other feature, from attendance to reminders, stays in sync automatically. This single source of truth becomes the foundation for the rest of your academic planning, which is why it\'s the very first step in setting up your account.' },
            { step: '02', title: 'Track every class automatically', desc: 'After each lecture, open StudiByte and mark whether you attended or missed it — it takes a few seconds. Behind the scenes, StudiByte calculates your attendance percentage for every course individually, comparing it against your target threshold and your school\'s minimum requirement. As the percentage gets close to the limit, you\'ll see a clear warning before it becomes a problem, instead of finding out when you\'re already barred from an exam. Over a full semester, this gives you an honest, continuously updated picture of your attendance across every course — something most students normally only estimate or guess at.' },
            { step: '03', title: 'Know your GPA in real time', desc: 'Most students wait until the end of the semester to find out their CGPA, by which point there\'s nothing left to do about it. StudiByte changes that by letting you enter scores the moment results come in — for a test, an assignment, or a final exam. Your semester GPA and overall CGPA recalculate instantly, using your exact school grading scale, whether that\'s a 3.0, 4.0, or 5.0 system. You can see, course by course, which grades are pulling your average up or down, making it far easier to decide where to focus your remaining study time before it\'s too late to change the outcome.' },
            { step: '04', title: 'Ask the AI anything', desc: 'When you\'re stuck on a topic — whether it\'s a single confusing paragraph in a textbook or an entire unit you missed — open the AI Study Assistant and ask it directly, in your own words. It explains the concept clearly, walks through worked examples, and can generate practice questions so you can test yourself before the real exam. Paste in your lecture notes and it will summarise them into the key points worth remembering. It\'s available at 1am the night before a test just as easily as it is during the day, so you\'re never stuck waiting for office hours to get unstuck.' },
          ].map((item, i) => (
            <motion.div key={item.step} className="flex gap-4"
              initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-green-400">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white font-display mb-0.5">{item.title}</p>
                <p className="text-xs text-dark-400 font-body leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <Section id="features">
        <SectionLabel>Features</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Built for how students actually study.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          Every feature was designed to save time, reduce stress, and help students perform better academically.
        </motion.p>
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard icon={Brain} color="#a855f7" delay={0}
            title="AI Study Assistant"
            desc="Ask questions on any subject and get clear, structured explanations instead of vague search results. The AI summarises long notes into key points, generates practice quizzes to test yourself before an exam, and walks through worked examples step by step — useful any time you're stuck with no lecturer around to ask." />
          <FeatureCard icon={TrendingUp} color="#fbbf24" delay={0.05}
            title="GPA Tracker"
            desc="Enter your scores as results come in and StudiByte calculates your GPA and CGPA instantly, using your exact school grading scale — 3.0, 4.0, or 5.0. Instead of waiting for an official transcript to find out where you stand, see in real time which courses are helping or hurting your average." />
          <FeatureCard icon={ClipboardList} color="#c084fc" delay={0.1}
            title="Assignment Manager"
            desc="Add every assignment with its deadline, course, and priority level the moment it's announced. StudiByte keeps the most urgent tasks visible at the top and reminds you before they're due, so important work never quietly slips past while you're focused on something else. Mark items complete as you finish." />
          <FeatureCard icon={Timer} color="#fb923c" delay={0.15}
            title="Study Timer"
            desc="Use the built-in Pomodoro-style timer to study in focused intervals with structured breaks in between, which research shows improves concentration and retention compared to long, unbroken sessions. StudiByte tracks your total study time per session and across the semester, so you can see your real effort, not just your intentions." />
          <FeatureCard icon={BookOpen} color="#22d3ee" delay={0.2}
            title="Course Materials"
            desc="Upload PDFs, scanned notes, images, and documents for each course as soon as you receive them. Materials are automatically organised by semester and course, so instead of scrolling through chats or folders during exam week, you open StudiByte and find exactly the file you need in seconds." />
          <FeatureCard icon={Bell} color="#f87171" delay={0.25}
            title="Class Reminders"
            desc="Get a push notification before each class starts — 10 minutes, 30 minutes, or a full hour ahead, whichever suits you. Reminders only fire for classes actually scheduled that day, so you're never caught off guard by a lecture you forgot was happening, even during a hectic week." />
          <FeatureCard icon={CheckCircle} color="#34d399" delay={0.3}
            title="Attendance Tracking"
            desc="Mark each class as attended or missed with a single tap. StudiByte calculates your attendance percentage per course in real time and warns you as you approach your school's minimum threshold, so you can correct course early instead of discovering the problem only when you're barred from an exam." />
          <FeatureCard icon={Cloud} color="#60a5fa" delay={0.35}
            title="Cloud Sync"
            desc="Every timetable entry, grade, assignment, and uploaded file is securely stored and synced across your devices automatically. Start an assignment on your laptop, check tomorrow's classes on your phone on the bus, and everything stays exactly up to date — no manual exporting or emailing files to yourself." />
          <FeatureCard icon={Search} color="#e879f9" delay={0.4}
            title="Smart Timetable"
            desc="Build your full weekly class schedule once and see today's classes at a glance the moment you open the app. StudiByte can also read an existing timetable from a PDF or screenshot using AI-powered document parsing, so you don't have to retype a schedule you already have written down somewhere." />
          <FeatureCard icon={Smartphone} color="#4ade80" delay={0.45}
            title="Install as App"
            desc="StudiByte installs directly to your home screen like a native app — no app store, no separate download. Once installed, it loads faster, works offline for your timetable and GPA data, and sends push notifications for class reminders, all without using up your phone's storage space." />
        </div>
      </Section>

      {/* ── AI SHOWCASE ──────────────────────────────────────────────────── */}
      <Section id="ai">
        <SectionLabel>AI Study Assistant</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Your personal tutor.<br />Available 24/7.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-6 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          Powered by Google Gemini, the StudiByte AI assistant goes beyond answering questions — it helps you think, learn, and prepare more effectively.
        </motion.p>

        {/* Mock chat UI */}
        <motion.div
          className="rounded-2xl border border-white/8 bg-dark-900 overflow-hidden mb-6"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Brain size={12} className="text-purple-400" />
            </div>
            <span className="text-xs font-bold text-white">StudiByte AI</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-green-400">Online</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-green-500/15 border border-green-500/20 rounded-2xl rounded-tr-sm px-3 py-2">
                <p className="text-xs text-white font-body">Can you explain Newton's second law with an example?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain size={11} className="text-purple-400" />
              </div>
              <div className="max-w-[80%] bg-dark-800 border border-white/8 rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-xs text-dark-100 font-body leading-relaxed">
                  <strong className="text-white">Newton's Second Law</strong> states that the acceleration of an object depends on the net force applied and its mass: <strong className="text-green-400">F = ma</strong>.<br /><br />
                  <strong className="text-white">Example:</strong> If you push a 5 kg trolley with 20 N of force, it accelerates at 4 m/s². Double the force to 40 N and it accelerates at 8 m/s².
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          {[
            { icon: Brain, color: '#a855f7', title: 'Concept explanations', desc: 'Breaks down complex topics from any subject into clear, digestible explanations with examples.' },
            { icon: FileText, color: '#22d3ee', title: 'Note summarisation', desc: 'Paste your lecture notes and the AI produces a concise, exam-ready summary in seconds.' },
            { icon: Award, color: '#fbbf24', title: 'Practice quiz generation', desc: 'Ask it to generate test questions from any topic so you can test yourself before exams.' },
            { icon: Zap, color: '#34d399', title: 'Instant revision help', desc: 'Review entire topics quickly by asking the AI to walk you through the most important points.' },
          ].map((item, i) => (
            <WhyCard key={item.title} {...item} delay={i * 0.06} />
          ))}
        </div>

        <motion.div className="mt-5 p-4 rounded-2xl"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs text-green-400 font-body leading-relaxed">
            <strong className="font-bold">Used responsibly, not as a shortcut.</strong> StudiByte AI is built to help you understand material faster — not to write assignments, exams, or anything you'll submit as your own original work. It can get things wrong, especially on very recent or highly specific course content, so always verify important facts against your lecture notes or textbook. Think of it as a study partner that's always awake, not a replacement for actually learning the material.
          </p>
        </motion.div>
      </Section>

      {/* ── STUDY TIPS ───────────────────────────────────────────────────── */}
      <Section id="tips">
        <SectionLabel>Study Smarter</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Real study techniques that work.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          Tools help you stay organised — but how you actually study still matters most. Here's what reliably works, based on how memory and motivation actually function.
        </motion.p>
        <div className="space-y-5">
          {[
            { icon: Timer, color: '#fb923c', title: 'Time management', desc: 'Block out specific times for each course every week instead of relying on "I\'ll study later." A fixed routine — even just 45 minutes after dinner for one subject — gets far more done than waiting for motivation to strike. Treat study blocks like a class: something you show up to, not something you fit in if there\'s time.' },
            { icon: Brain, color: '#a855f7', title: 'Active recall', desc: 'Re-reading notes feels productive but teaches you very little — your brain recognises the material without actually retrieving it. Active recall means closing the book and forcing yourself to write or say what you remember, then checking against your notes. It\'s harder than re-reading, which is exactly why it works.' },
            { icon: ClipboardList, color: '#c084fc', title: 'Spaced repetition', desc: 'Cramming the night before an exam produces short-term recognition that fades within days. Spaced repetition spreads the same material across several short sessions — a few minutes today, again in two days, again in a week — which builds far stronger long-term memory than one long session ever could.' },
            { icon: Zap, color: '#fbbf24', title: 'Avoiding procrastination', desc: 'Procrastination usually isn\'t laziness — it\'s avoiding a task that feels too big or unpleasant to start. The fix is shrinking the first step until it\'s almost too easy to skip: not "write the essay," but "open the document and write one sentence." Momentum tends to carry you further than you expect.' },
            { icon: Award, color: '#34d399', title: 'Exam preparation', desc: 'Effective exam preparation starts well before revision week. Work backwards from the exam date, list every topic on the syllabus, and assign each one a realistic session rather than trying to cover everything at once. Practising with past questions under timed conditions matters as much as reviewing notes.' },
            { icon: TrendingUp, color: '#60a5fa', title: 'Improving your GPA', desc: 'Improving your GPA is rarely about working equally hard across every course — it\'s about identifying which courses are dragging your average down and giving them targeted attention. A single low grade in a high-credit course can outweigh several strong grades in smaller ones.' },
          ].map((item, i) => (
            <WhyCard key={item.title} {...item} delay={i * 0.05} />
          ))}
        </div>
      </Section>

      {/* ── ACADEMIC RESOURCES ───────────────────────────────────────────── */}
      <Section id="resources">
        <SectionLabel>Academic Resources</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Useful to you, even before you sign up.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          A few practical, evidence-based answers to questions almost every student eventually asks.
        </motion.p>
        <div className="space-y-4">
          {[
            { title: 'How your CGPA is actually calculated', desc: 'Your CGPA is the credit-weighted average of every grade point you\'ve earned across all completed courses. Each course grade converts to a grade point (an A might equal 5.0, depending on your school\'s scale), then multiplies by that course\'s credit units. Add up every course\'s grade point × credit units, divide by your total credit units, and that result is your CGPA — which is why one high-credit course affects it more than a low-credit one.' },
            { title: 'A practical system for assignment deadlines', desc: 'Rather than tracking deadlines in your head, list every assignment with its due date and break larger ones into smaller milestones — research done by one date, a first draft by another, final review a day before submission. Working backward from the deadline in stages, rather than starting the whole task at once, makes large assignments far less overwhelming and easier to actually finish on time.' },
            { title: 'Common study mistakes worth fixing', desc: 'Three mistakes show up again and again: relying on highlighting and re-reading instead of actively testing yourself, leaving most revision until the final week of the semester instead of spreading it out, and studying for long unbroken stretches without breaks, which hurts focus more than it helps. Recognising which of these you do is usually the fastest way to improve.' },
            { title: 'Time management beyond a to-do list', desc: 'A to-do list tells you what to do, but not when you\'ll realistically have time to do it. Try assigning each task an actual time slot in your week — including travel, classes, and rest — rather than just listing it. If a task doesn\'t fit anywhere in your real schedule, that\'s useful information sooner rather than a missed deadline later.' },
            { title: 'Why consistency outperforms intensity', desc: 'A student who studies for 30–45 minutes most days will typically outperform one who studies for six hours once a week, even with the same total time invested. Consistent, smaller sessions keep material fresh in memory and prevent the buildup of stress that comes from cramming — which is also why showing up regularly matters more than any single long session.' },
            { title: 'Exam week: what actually helps', desc: 'In the final days before an exam, switching between two or three related topics (a technique called interleaving) helps your brain make connections that staying on one subject for hours doesn\'t. Prioritise sleep over a final all-nighter — memory consolidation happens while you sleep, and tired recall is unreliable recall, no matter how many hours you put in.' },
          ].map((item, i) => (
            <motion.div key={item.title}
              className="p-4 rounded-2xl bg-dark-900/50 border border-white/5"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-1.5">{item.title}</p>
              <p className="text-sm text-dark-300 font-body leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── INSTALL ──────────────────────────────────────────────────────── */}
        <SectionLabel>Install StudiByte</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          On your phone in 30 seconds.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-7 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          StudiByte is a Progressive Web App — no app store required. Install it directly from your browser and it works like a native app.
        </motion.p>

        <div className="space-y-4">
          {[
            {
              icon: Smartphone, color: '#34d399', label: 'Android',
              steps: ['Open studibyte.app in Chrome', 'Tap the menu (⋮) in the top right', 'Select "Add to Home Screen"', 'Tap Add — done.'],
            },
            {
              icon: Apple, color: '#9ca3af', label: 'iPhone / iPad',
              steps: ['Open studibyte.app in Safari', 'Tap the Share button (□↑)', 'Scroll down and tap "Add to Home Screen"', 'Tap Add — done.'],
            },
            {
              icon: Monitor, color: '#60a5fa', label: 'Desktop (Chrome / Edge)',
              steps: ['Open studibyte.app in Chrome or Edge', 'Click the install icon (⊕) in the address bar', 'Click Install in the popup', 'StudiByte opens as a standalone window.'],
            },
          ].map((platform, i) => (
            <motion.div key={platform.label}
              className="p-4 rounded-2xl bg-dark-900/60 border border-white/6"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}25` }}>
                  <platform.icon size={14} style={{ color: platform.color }} />
                </div>
                <span className="text-sm font-bold text-white font-display">{platform.label}</span>
              </div>
              <ol className="space-y-1.5">
                {platform.steps.map((step, si) => (
                  <li key={si} className="flex gap-2 text-xs text-dark-400 font-body">
                    <span className="text-dark-600 flex-shrink-0">{si + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-5 p-4 rounded-2xl"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs text-green-400 font-body leading-relaxed">
            <strong className="font-bold">Why install?</strong> Installing StudiByte gives you faster load times, offline access to your timetable and GPA data, push notifications for class reminders, and a full-screen experience without browser UI in the way.
          </p>
        </motion.div>
      {/*section bug removed here-- */}

      {/* ── WHY STUDENTS LOVE IT ─────────────────────────────────────────── */}
      <Section>
        <SectionLabel>Why Students Choose StudiByte</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-8" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Designed for results, not just features.
        </motion.h2>
        <div className="space-y-5">
          {[
            { icon: Zap, color: '#fbbf24', title: 'Everything in one place', desc: 'Stop switching between five apps to manage your academic life. StudiByte brings your timetable, GPA, assignments, materials, and AI tutor into one focused workspace.' },
            { icon: Shield, color: '#34d399', title: 'Your data stays private', desc: 'StudiByte uses Firebase Authentication and Firestore security rules. Your academic data is private to your account and never shared or sold.' },
            { icon: Smartphone, color: '#60a5fa', title: 'Built mobile-first', desc: 'Designed for the device you actually use — your phone. Every screen, button, and interaction is optimised for one-handed mobile use.' },
            { icon: Brain, color: '#a855f7', title: 'AI that actually helps', desc: 'Not a gimmick. The AI assistant answers real academic questions across all subjects and improves the more context you give it.' },
            { icon: Award, color: '#f97316', title: 'Real GPA visibility', desc: 'Know where you stand at all times. Enter scores as results come in and watch your GPA update in real time — no more waiting for the end-of-semester shock.' },
            { icon: Users, color: '#e879f9', title: 'Works for any institution', desc: 'Whether your school uses a 3.0, 4.0, or 5.0 CGPA scale, StudiByte adapts to your grading system automatically.' },
            { icon: CheckCircle, color: '#22c55e', title: 'Attendance you can trust', desc: 'Track every class with one tap. Know exactly how many classes you can miss before it affects your grade — before it happens, not after.' },
            { icon: Download, color: '#94a3b8', title: 'Works without internet', desc: 'Core features like timetable and GPA data are available offline. Changes sync automatically when you reconnect.' },
          ].map((item, i) => (
            <WhyCard key={item.title} {...item} delay={i * 0.05} />
          ))}
        </div>
      </Section>

      {/* ── WHY STUDENTS TRUST STUDIBYTE ─────────────────────────────────── */}
      <Section id="trust">
        <SectionLabel>Trust & Reliability</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Built on trust, not just features.
        </motion.h2>
        <motion.p className="text-sm text-dark-400 font-body mb-8 leading-relaxed"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
          Trust matters as much as functionality when an app holds your academic life. Here's what that looks like in practice.
        </motion.p>
        <div className="space-y-5">
          {[
            { icon: Shield, color: '#34d399', title: 'Your data stays private', desc: 'Your academic records, notes, and personal details belong to you. StudiByte stores data using Firebase\'s security infrastructure with strict access rules, meaning only your authenticated account can read or write your information. Nothing is sold to advertisers or shared with third parties — your CGPA, timetable, and uploaded files stay private to you.' },
            { icon: Lock, color: '#60a5fa', title: 'Secure sign-in, every time', desc: 'Every account is protected by Firebase Authentication, the same system used by major production apps. Passwords are never stored in plain text, sign-in attempts are rate-limited against abuse, and you can reset your password securely at any time through a verified email link rather than a support ticket.' },
            { icon: Brain, color: '#a855f7', title: 'AI you can rely on', desc: 'The AI assistant is a study aid, not a replacement for learning. It\'s designed to explain concepts and support revision, with clear limits on what it should be used for — it won\'t write graded work on your behalf, and you\'re always encouraged to verify important facts against your own course material.' },
            { icon: Cloud, color: '#22d3ee', title: 'Available wherever you are', desc: 'Your timetable, grades, and uploaded materials sync automatically across every device you use. Start reviewing a topic on your phone between classes and pick up exactly where you left off on a laptop later — no exporting files, emailing yourself notes, or losing work when you switch devices.' },
            { icon: CheckCircle, color: '#fb923c', title: 'Built for daily reliability', desc: 'Academic planning only helps if it\'s there when you need it. StudiByte is built to work consistently every day of the semester — not just during a demo — with offline access to your core data so a weak connection on campus doesn\'t stop you from checking your schedule or assignments.' },
            { icon: Award, color: '#e879f9', title: 'A genuine commitment to students', desc: 'StudiByte exists for one reason: to help students stay organised and perform better academically, without the cost or complexity of juggling five separate tools. That commitment shapes every feature we build — if it doesn\'t genuinely help a student\'s coursework or grades, it doesn\'t make it into the app.' },
          ].map((item, i) => (
            <WhyCard key={item.title} {...item} delay={i * 0.05} />
          ))}
        </div>
      </Section>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <Section id="about">
        <SectionLabel>About StudiByte</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-4" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Built by a student,<br />for every student.
        </motion.h2>

        <div className="space-y-4">
          {[
            {
              title: 'Our Mission',
              desc: 'To give every university student the tools, information, and AI support they need to take control of their academic performance — regardless of their institution or resources.',
            },
            {
              title: 'Our Vision',
              desc: 'A future where no student fails a course simply because they lacked the right organisational tools, missed important deadlines, or had no one to help them understand difficult material.',
            },
            {
              title: 'What We\'re Building',
              desc: 'StudiByte is growing into a comprehensive academic platform. Upcoming features include past questions, collaborative study groups, smart document search, and deeper AI integration across every part of the academic journey.',
            },
            {
              title: 'Our Commitment',
              desc: 'StudiByte will always have a free tier that covers the essential needs of every student. We believe academic tools should be accessible, not gated behind expensive subscriptions.',
            },
          ].map((item, i) => (
            <motion.div key={item.title}
              className="p-4 rounded-2xl bg-dark-900/50 border border-white/5"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-1.5">{item.title}</p>
              <p className="text-sm text-dark-300 font-body leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <Section id="faq">
        <SectionLabel>Frequently Asked Questions</SectionLabel>
        <motion.h2 className="text-2xl font-black text-white font-display mb-6" style={{ letterSpacing: '-0.8px' }}
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Everything you need to know.
        </motion.h2>
        <div className="rounded-2xl bg-dark-900/50 border border-white/6 px-4 overflow-hidden">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-2xl mx-auto">
        <motion.div
          className="relative rounded-3xl p-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(34,197,94,0.2)' }}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
          <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={20} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.8px' }}>
            Ready to study smarter?
          </h2>
          <p className="text-sm text-dark-400 font-body mb-6 max-w-xs mx-auto leading-relaxed">
            Join thousands of students using StudiByte to track their GPA, manage their schedule, and learn faster with AI.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-dark-950 touch-manipulation active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            Create Free Account <ArrowRight size={15} />
          </button>
          <p className="text-xs text-dark-600 mt-3 font-body">No credit card required · Free to start</p>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="px-5 py-8 max-w-2xl mx-auto border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
              <Sparkles size={11} className="text-dark-950" />
            </div>
            <span className="text-xs font-black text-white font-display">StudiByte</span>
          </div>
          <p className="text-[10px] text-dark-600 font-body">© {new Date().getFullYear()} StudiByte. All rights reserved.</p>
        </div>
        <p className="text-[10px] text-dark-600 font-body leading-relaxed mt-4 max-w-md">
          StudiByte is an AI-powered academic platform built to help students stay organised, track their CGPA accurately, and study more effectively — bringing timetables, assignments, course materials, and an AI study assistant together in one place, with the mission of helping every student improve their academic performance without juggling five different apps.
        </p>
        <div className="flex gap-4 mt-4">
          {['Features', 'AI Assistant', 'Install', 'About', 'FAQ'].map(link => (
            <button key={link}
              onClick={() => document.getElementById(link.toLowerCase().replace(' ', ''))?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[10px] text-dark-500 hover:text-dark-300 transition-colors font-body">
              {link}
            </button>
          ))}
        </div>
      </footer>

      {/* ── SCROLL TO BOTTOM BUTTON ──────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            onClick={scrollToBottom}
            className="fixed bottom-6 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: 'rgba(17,24,28,0.88)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
            initial={{ opacity: 0, scale: 0.75, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            whileTap={{ scale: 0.88 }}
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={17} className="text-green-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom anchor — scrollToBottom() targets this */}
      <div ref={bottomRef} />
    </div>
  );
}