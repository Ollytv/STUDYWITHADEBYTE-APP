"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Features;
// src/pages/public/Features.tsx
const framer_motion_1 = require("framer-motion");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const PublicLayout_1 = __importDefault(require("../../components/public/PublicLayout"));
function SectionLabel({ children }) {
    return (<div className="flex items-center gap-2 mb-3">
      <div className="w-4 h-px bg-green-500"/>
      <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">{children}</span>
    </div>);
}
const FEATURES = [
    {
        icon: lucide_react_1.Brain, color: '#a855f7',
        title: 'AI Study Assistant',
        tagline: 'Academic support at any hour.',
        desc: 'The StudiByte AI assistant is powered by Google Gemini and scoped specifically to academic use. It explains concepts across all subjects — from calculus to contract law — summarises lecture notes, generates practice quiz questions, and works through quantitative problems step by step. It is not a homework-completion tool; it is a learning aid that helps you understand material more deeply so you can produce better work yourself.',
        bullets: ['Explains any academic concept clearly', 'Summarises dense lecture notes in seconds', 'Generates multiple-choice and short-answer practice questions', 'Works through mathematical problems step by step', 'Available 24 hours a day, every day of the semester'],
    },
    {
        icon: lucide_react_1.TrendingUp, color: '#fbbf24',
        title: 'GPA & CGPA Tracker',
        tagline: 'Know your standing throughout the semester.',
        desc: 'Most students only find out their GPA after official results are released — by which point there is nothing left to do about it. StudiByte calculates your semester GPA and cumulative CGPA in real time as you enter scores, giving you a continuously accurate picture of your academic standing. Supports 3.0, 4.0, and 5.0 grading scales. GPA is calculated using the weighted average method, adjusted for credit units per course.',
        bullets: ['Real-time GPA updates as you enter results', 'Supports 3.0, 4.0, and 5.0 CGPA scales', 'Weighted calculation by credit units', 'Semester and cumulative GPA displayed separately', 'Academic classification shown (First Class, Second Class, etc.)'],
    },
    {
        icon: lucide_react_1.ClipboardList, color: '#c084fc',
        title: 'Assignment Manager',
        tagline: 'Every deadline, in one place.',
        desc: 'The assignment manager captures every coursework deadline — essays, projects, presentations, lab reports — and organises them by urgency and course. You assign a priority level (low, medium, or high) and mark items as complete when done. StudiByte sends push notification reminders before deadlines arrive so nothing falls through the gaps. Students who record all assignments in a dedicated planner are significantly less likely to miss submission dates.',
        bullets: ['Record deadlines with course, priority, and description', 'Filter by urgency to focus on what matters most', 'Push notification reminders before due dates', 'Mark assignments complete with one tap', 'Organised by semester so previous work is never lost'],
    },
    {
        icon: lucide_react_1.Timer, color: '#fb923c',
        title: 'Pomodoro Study Timer',
        tagline: 'Focused study sessions with structured breaks.',
        desc: 'The Pomodoro technique divides study time into focused 25-minute intervals separated by 5-minute breaks. After four intervals, a longer 20-minute break follows. Research shows this approach reduces decision fatigue, improves concentration, and prevents the mental exhaustion that comes from studying for hours without stopping. The StudiByte timer implements this automatically and tracks your total study time per session.',
        bullets: ['25-minute focus intervals with automatic break reminders', 'Tracks total study time per session', 'Helps build consistent daily study habits', 'Reduces procrastination by making starting easier', 'Works offline once the app is installed'],
    },
    {
        icon: lucide_react_1.BookOpen, color: '#22d3ee',
        title: 'Course Materials Storage',
        tagline: 'All your study files, organised by course.',
        desc: 'Upload PDFs, images, and documents for each course and semester. Materials are stored securely in Firebase and linked to the correct subject so you can find exactly what you need without scrolling through your camera roll or redownloading files from WhatsApp. Previously uploaded materials are available offline after the initial sync, so your notes are accessible even in areas with poor connectivity.',
        bullets: ['Upload PDFs, images, and study documents', 'Organised by course and semester automatically', 'Available offline after the initial sync', 'No more searching through camera rolls or messaging apps', 'Each file linked to a specific course for instant retrieval'],
    },
    {
        icon: lucide_react_1.Bell, color: '#f87171',
        title: 'Class Reminders',
        tagline: 'Never be late or miss a lecture.',
        desc: 'Once your timetable is set up, StudiByte can send push notifications before each class begins. You choose the timing — 10 minutes, 30 minutes, or 1 hour ahead. Notifications only fire on days when that class is actually scheduled, so you are not reminded about a Thursday lecture on a Monday morning. Consistent attendance directly affects both your attendance percentage and how well you absorb material before exams.',
        bullets: ['Configurable reminder timing per preference', 'Notifications fire only on scheduled class days', 'Supports multiple reminder intervals simultaneously', 'Works as a background push notification when app is closed', 'Reminders display course name, time, and venue'],
    },
    {
        icon: lucide_react_1.CheckCircle, color: '#34d399',
        title: 'Attendance Tracker',
        tagline: 'Know your percentage before it becomes a problem.',
        desc: 'Mark each class as attended or missed with a single tap. StudiByte calculates your attendance percentage per course and displays a colour-coded status — green when you are safely above target, yellow when approaching the minimum, and red when you are at risk. Most students who are barred from exams for attendance reasons say they did not realise how quickly absences accumulated. StudiByte makes the accumulation visible from the first missed class.',
        bullets: ['One-tap marking after each class', 'Live attendance percentage per course', 'Colour-coded status (safe / warning / at risk)', 'Configurable attendance target per course', 'Full attendance history maintained per semester'],
    },
    {
        icon: lucide_react_1.Cloud, color: '#60a5fa',
        title: 'Cloud Sync',
        tagline: 'Your data on every device, always up to date.',
        desc: 'All StudiByte data is stored in Firebase and synchronised across every device where you are signed in. Add a class on your phone during a lecture and it is immediately visible on your laptop when you sit down at the library. Your GPA records, attendance history, assignments, and materials are always current regardless of which device you last used, with no manual syncing required.',
        bullets: ['Automatic sync across all signed-in devices', 'No manual backup or export required', 'Data available offline with automatic sync on reconnect', 'Firebase provides enterprise-grade reliability and uptime', 'Full history preserved across every semester'],
    },
    {
        icon: lucide_react_1.Search, color: '#e879f9',
        title: 'Smart Timetable Import',
        tagline: 'Build your schedule from a PDF or screenshot.',
        desc: 'Rather than manually entering each class one by one, StudiByte can extract your timetable from a PDF document, Word file, or screenshot image using AI-powered document parsing. The system identifies course names, days, times, and venues and builds your schedule automatically. You review the extracted data before anything is saved — giving you full control while eliminating the tedious data entry.',
        bullets: ['Import from PDF, Word document, or image', 'AI extracts course names, times, days, and venues', 'Full review and edit before saving', 'Handles multiple timetable formats', 'Manual entry also available for individual classes'],
    },
    {
        icon: lucide_react_1.Smartphone, color: '#4ade80',
        title: 'Install as Native App',
        tagline: 'On your home screen in 30 seconds.',
        desc: 'StudiByte is a Progressive Web App, which means it installs directly from your browser onto your home screen without an app store. On Android, open the site in Chrome and tap "Add to Home Screen." On iPhone, use Safari\'s Share menu. The installed version loads faster, works offline, supports push notifications, and opens in a full-screen experience without browser navigation bars. Installation takes under 30 seconds.',
        bullets: ['No app store required — install directly from browser', 'Android: Chrome → Add to Home Screen', 'iPhone: Safari → Share → Add to Home Screen', 'Desktop: Chrome or Edge install button in address bar', 'Full offline functionality after installation'],
    },
];
function Features() {
    return (<PublicLayout_1.default title="StudiByte Features — AI Study Assistant, GPA Tracker, Timetable & More" description="Explore all StudiByte features: AI-powered study assistant, real-time GPA and CGPA tracker, attendance monitor, assignment manager, Pomodoro timer, course materials storage, and smart timetable import.">
      <div className="max-w-2xl mx-auto px-5">

        <section className="py-16">
          <SectionLabel>Platform Features</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Every tool a student needs.<br />
            <span className="text-green-400">All in one place.</span>
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            StudiByte combines ten academic management tools into a single application. Here is a detailed breakdown of what each feature does and why it matters for your academic performance.
          </framer_motion_1.motion.p>
        </section>

        <div className="space-y-10 pb-16">
          {FEATURES.map((feat, i) => (<framer_motion_1.motion.article key={feat.title} className="pb-10 border-b border-white/5 last:border-0" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}>
                  <feat.icon size={18} style={{ color: feat.color }}/>
                </div>
                <div>
                  <h2 className="text-base font-black text-white font-display leading-tight">{feat.title}</h2>
                  <p className="text-[10px] font-semibold" style={{ color: feat.color }}>{feat.tagline}</p>
                </div>
              </div>
              <p className="text-sm text-dark-400 font-body leading-relaxed mb-4">{feat.desc}</p>
              <ul className="space-y-1.5">
                {feat.bullets.map(b => (<li key={b} className="flex gap-2 text-xs text-dark-500 font-body">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0 mt-1.5"/>
                    {b}
                  </li>))}
              </ul>
            </framer_motion_1.motion.article>))}
        </div>

        <section className="pb-16">
          <framer_motion_1.motion.div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(168,85,247,0.07))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-black text-white font-display mb-2">Try all features free.</h2>
            <p className="text-xs text-dark-400 font-body mb-5 max-w-xs mx-auto">
              Every feature described above is included in the free tier. No credit card, no trial period.
            </p>
            <react_router_dom_1.Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-dark-950" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              Get Started Free <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </framer_motion_1.motion.div>
        </section>
      </div>
    </PublicLayout_1.default>);
}
//# sourceMappingURL=Features.js.map