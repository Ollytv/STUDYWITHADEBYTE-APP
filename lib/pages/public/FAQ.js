"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FAQ;
// src/pages/public/FAQ.tsx
const react_1 = require("react");
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
const CATEGORIES = [
    {
        label: 'General',
        items: [
            { q: 'What is StudiByte?', a: 'StudiByte is a free AI-powered academic productivity platform for university and college students. It combines a smart timetable manager, GPA and CGPA calculator, attendance tracker, assignment planner, AI study assistant, and course material storage into a single mobile-first application. The goal is to replace the five or six disconnected apps most students use with one organised, coherent workspace.' },
            { q: 'Who is StudiByte designed for?', a: 'StudiByte is designed for undergraduate and postgraduate students at universities and colleges. It is particularly useful for students who want to track their GPA throughout the semester, manage attendance carefully, plan assignments in advance, and access academic support outside of office hours. The platform works for any institution and any subject area.' },
            { q: 'Is StudiByte free?', a: 'Yes. The core features of StudiByte — timetable management, GPA tracking, attendance monitoring, assignment planning, AI study assistance, and course material uploads — are all free. There is no credit card required to sign up and no trial period that expires.' },
            { q: 'Does StudiByte require an app store installation?', a: 'No. StudiByte is a Progressive Web App (PWA) that installs directly from your browser onto your home screen. On Android, open the site in Chrome and tap "Add to Home Screen." On iPhone, use Safari\'s Share button and select "Add to Home Screen." On desktop, look for the install icon in the address bar in Chrome or Edge.' },
        ],
    },
    {
        label: 'GPA & Grades',
        items: [
            { q: 'Which CGPA scales does StudiByte support?', a: 'StudiByte supports 3.0, 4.0, and 5.0 CGPA scales — the three grading systems used by the majority of universities worldwide. You select your school\'s scale during initial setup, and all GPA calculations automatically use the correct maximum. You can change your selected scale at any time in your profile settings.' },
            { q: 'How does GPA calculation work in StudiByte?', a: 'You enter the score (0–100) for each course. StudiByte converts the score to a letter grade and grade point based on your institution\'s grading scale, then calculates your semester GPA using the weighted average method — meaning courses with more credit units have a proportionally larger impact on your GPA. Your cumulative CGPA is calculated across all semesters.' },
            { q: 'Can I see my GPA update in real time?', a: 'Yes. Your GPA and CGPA update immediately each time you add or modify a course score. You do not need to wait for official results or perform any manual calculation. This real-time visibility is one of the most important features in StudiByte because it allows you to act while there is still time to improve.' },
            { q: 'Can I track GPA across multiple semesters?', a: 'Yes. StudiByte organises all academic data by semester and academic year. Your CGPA is calculated across every semester you have recorded results for. You can switch between semesters to review your GPA history without losing any data.' },
        ],
    },
    {
        label: 'AI Assistant',
        items: [
            { q: 'How does the AI Study Assistant work?', a: 'The AI assistant is powered by Google Gemini. You type a question or request — explaining a concept, summarising notes, generating practice questions, or working through a problem — and the assistant responds with a structured, formatted answer. It supports markdown, code blocks, tables, and numbered steps so answers are readable and well-organised.' },
            { q: 'Does the AI write assignments for me?', a: 'No. The StudiByte AI is designed for academic learning support, not academic dishonesty. It will help you understand concepts, break down problems, and think more clearly — but it will not write your assignments, complete take-home tests, or generate work for submission. Using AI to submit work as your own violates the academic integrity policies of most institutions.' },
            { q: 'What subjects can the AI help with?', a: 'The AI assistant covers all academic subjects including mathematics, physics, chemistry, biology, computer science and programming, engineering, economics, business, law, history, literature, geography, and more. If you can phrase a question clearly, the AI can help you work through it.' },
            { q: 'Are my AI conversations saved?', a: 'Yes. Conversations are saved to your Firestore account so you can revisit previous explanations and continue where you left off. You can delete individual conversations at any time from the conversation history panel in the AI assistant.' },
        ],
    },
    {
        label: 'Attendance & Timetable',
        items: [
            { q: 'How does attendance tracking work?', a: 'For every class on your timetable, you tap once to mark it as attended or missed after the class takes place. StudiByte calculates your attendance percentage for each course and displays a colour-coded status. A warning appears when you fall below your configured attendance target, giving you time to prioritise attendance before the minimum threshold is breached.' },
            { q: 'Can I import my timetable automatically?', a: 'Yes. The timetable import feature uses AI to extract class information from PDF documents, Word files, or screenshot images. It identifies course names, days, times, and venues and populates your timetable automatically. You review all extracted data before saving, so you remain in full control of what is added.' },
            { q: 'Can I get reminders before classes?', a: 'Yes. Once your timetable is set up and push notifications are enabled, StudiByte sends reminders before each scheduled class. You can configure the lead time — 10 minutes, 30 minutes, or 1 hour. Reminders only fire on the days each class is actually scheduled.' },
        ],
    },
    {
        label: 'Privacy & Security',
        items: [
            { q: 'Is my data private?', a: 'Yes. Your academic data is stored in Firebase with strict Firestore security rules that ensure no user can access another user\'s data. StudiByte does not serve advertising inside the app, does not sell your data, and does not share your information with third parties. Your GPA, attendance, materials, and profile are visible only to you.' },
            { q: 'Does StudiByte work offline?', a: 'Yes. StudiByte uses Firestore offline persistence, which means your timetable, GPA, assignments, and previously viewed materials remain accessible without an internet connection. Changes made offline sync automatically when you reconnect.' },
            { q: 'Can I delete my account and data?', a: 'Yes. You can delete your account at any time from the Settings page. Deleting your account permanently removes all your data from Firestore including your profile, timetable, GPA records, attendance history, assignments, and uploaded materials. StudiByte does not retain copies of deleted user data.' },
            { q: 'Is my data available across multiple devices?', a: 'Yes. Because all data is stored in Firebase, everything syncs across every device where you are signed in. Your timetable, GPA records, and materials are always available on your phone and your laptop simultaneously, with no manual syncing required.' },
        ],
    },
];
function FAQItem({ q, a, index }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    return (<framer_motion_1.motion.div className="border-b border-white/6" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.02 }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-4 text-left gap-3 touch-manipulation">
        <span className="text-sm font-semibold text-white font-body leading-snug">{q}</span>
        <framer_motion_1.motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }} className="flex-shrink-0">
          <lucide_react_1.ChevronDown size={14} className="text-dark-500"/>
        </framer_motion_1.motion.div>
      </button>
      <framer_motion_1.AnimatePresence initial={false}>
        {open && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <p className="pb-4 text-sm text-dark-400 font-body leading-relaxed pr-6">{a}</p>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </framer_motion_1.motion.div>);
}
function FAQ() {
    return (<PublicLayout_1.default title="StudiByte FAQ — Frequently Asked Questions About the Student Platform" description="Answers to common questions about StudiByte: GPA calculation, AI study assistant, attendance tracking, data privacy, offline access, CGPA scales, and how to install the app.">
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16">
          <SectionLabel>Frequently Asked Questions</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Everything you need to know.
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed mb-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            Browse questions by category below. If you cannot find what you are looking for, visit the <react_router_dom_1.Link to="/support" className="text-green-400 hover:text-green-300">Support page</react_router_dom_1.Link> or ask the StudiByte AI assistant directly after creating your account.
          </framer_motion_1.motion.p>
        </section>

        <div className="space-y-10 pb-16">
          {CATEGORIES.map((cat, ci) => (<section key={cat.label}>
              <framer_motion_1.motion.h2 className="text-base font-black text-white font-display mb-1" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                {cat.label}
              </framer_motion_1.motion.h2>
              <div className="rounded-2xl bg-dark-900/50 border border-white/6 px-4 overflow-hidden">
                {cat.items.map((item, i) => (<FAQItem key={i} q={item.q} a={item.a} index={ci * 10 + i}/>))}
              </div>
            </section>))}
        </div>

        <section className="pb-16">
          <framer_motion_1.motion.div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(168,85,247,0.07))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-black text-white font-display mb-2">Still have questions?</h2>
            <p className="text-xs text-dark-400 font-body mb-5 max-w-xs mx-auto">
              Visit the Support page or create an account and ask the AI assistant directly.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <react_router_dom_1.Link to="/support" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-dark-950" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                Go to Support <lucide_react_1.ArrowRight size={14}/>
              </react_router_dom_1.Link>
              <react_router_dom_1.Link to="/" className="text-xs text-dark-500 hover:text-dark-300 font-body transition-colors">
                Or create a free account →
              </react_router_dom_1.Link>
            </div>
          </framer_motion_1.motion.div>
        </section>
      </div>
    </PublicLayout_1.default>);
}
//# sourceMappingURL=FAQ.js.map