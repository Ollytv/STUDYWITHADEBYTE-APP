"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = About;
// src/pages/public/About.tsx
const framer_motion_1 = require("framer-motion");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const PublicLayout_1 = __importDefault(require("../../components/public/PublicLayout"));
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
};
function SectionLabel({ children }) {
    return (<div className="flex items-center gap-2 mb-3">
      <div className="w-4 h-px bg-green-500"/>
      <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">{children}</span>
    </div>);
}
function ValueCard({ icon: Icon, color, title, desc, delay = 0 }) {
    return (<framer_motion_1.motion.div className="p-5 rounded-2xl border border-white/6 bg-dark-900/60" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <h3 className="text-sm font-bold text-white font-display mb-1.5">{title}</h3>
      <p className="text-xs text-dark-400 font-body leading-relaxed">{desc}</p>
    </framer_motion_1.motion.div>);
}
function About() {
    return (<PublicLayout_1.default title="About StudiByte — AI-Powered Student Productivity Platform" description="Learn about StudiByte's mission to help university students manage their academic life with AI-powered tools including GPA tracking, timetable management, and an intelligent study assistant.">
      <div className="max-w-2xl mx-auto px-5">

        {/* Hero */}
        <section className="py-16">
          <framer_motion_1.motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <SectionLabel>About StudiByte</SectionLabel>
          </framer_motion_1.motion.div>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-4 leading-tight" style={{ letterSpacing: '-1px' }} variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            Built by a student.<br />
            <span className="text-green-400">Built for every student.</span>
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-300 font-body leading-relaxed mb-3" variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            StudiByte started from a simple observation: university students spend enormous amounts of time managing the logistics of studying — tracking attendance, chasing assignment deadlines, calculating GPA, and searching for misplaced notes — instead of actually studying. The tools available to most students were either too generic, too expensive, or too complicated to sustain past the first week of semester.
          </framer_motion_1.motion.p>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            StudiByte was built to fix that. It combines every academic management tool a student needs — timetable, GPA tracker, attendance monitor, assignment planner, course material storage, and an AI study assistant — into a single fast, mobile-first application that takes minutes to set up and stays useful for the entire duration of a degree.
          </framer_motion_1.motion.p>
        </section>

        {/* Mission / Vision */}
        <section className="pb-16">
          <SectionLabel>Our Foundation</SectionLabel>
          <h2 className="text-2xl font-black text-white font-display mb-6" style={{ letterSpacing: '-0.8px' }}>
            What we stand for.
          </h2>
          <div className="space-y-4">
            {[
            {
                icon: lucide_react_1.Target, color: '#22c55e', delay: 0,
                title: 'Mission',
                desc: 'To give every university and college student access to the academic management tools and AI-powered support they need to perform at their best — regardless of their institution, location, or financial resources. The core features of StudiByte will always be free.',
            },
            {
                icon: lucide_react_1.Eye, color: '#60a5fa', delay: 0.07,
                title: 'Vision',
                desc: 'A future where no student fails a course because they lacked the right tools, missed a deadline they did not know about, or had no one available to help them understand difficult material. Technology has made this possible. StudiByte makes it accessible.',
            },
            {
                icon: lucide_react_1.Heart, color: '#f87171', delay: 0.14,
                title: 'Commitment',
                desc: 'We are committed to building StudiByte in the open, with student feedback at the centre of every decision. We do not serve advertising inside the app. We do not sell user data. We do not put essential academic features behind a paywall.',
            },
        ].map(item => (<framer_motion_1.motion.div key={item.title} className="flex gap-4 p-4 rounded-2xl bg-dark-900/50 border border-white/5" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: item.delay }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                  <item.icon size={16} style={{ color: item.color }}/>
                </div>
                <div>
                  <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-1">{item.title}</p>
                  <p className="text-sm text-dark-300 font-body leading-relaxed">{item.desc}</p>
                </div>
              </framer_motion_1.motion.div>))}
          </div>
        </section>

        {/* What we're building */}
        <section className="pb-16">
          <SectionLabel>The Platform</SectionLabel>
          <h2 className="text-2xl font-black text-white font-display mb-3" style={{ letterSpacing: '-0.8px' }}>
            What StudiByte includes today.
          </h2>
          <p className="text-sm text-dark-400 font-body leading-relaxed mb-6">
            StudiByte currently provides ten integrated academic tools, all accessible from a single account with no app store installation required.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ValueCard icon={lucide_react_1.Brain} color="#a855f7" delay={0} title="AI Study Assistant" desc="Powered by Google Gemini. Explains concepts, summarises notes, generates practice questions across all subjects."/>
            <ValueCard icon={lucide_react_1.Zap} color="#fbbf24" delay={0.05} title="GPA Tracker" desc="Real-time GPA and CGPA calculation supporting 3.0, 4.0, and 5.0 grading scales."/>
            <ValueCard icon={lucide_react_1.CheckCircle} color="#34d399" delay={0.1} title="Attendance Monitor" desc="Track every class, monitor your percentage per course, get warned before you fall below the minimum."/>
            <ValueCard icon={lucide_react_1.Sparkles} color="#22d3ee" delay={0.15} title="Smart Timetable" desc="AI-powered import from PDFs and screenshots, with push notifications before each lecture."/>
          </div>
          <framer_motion_1.motion.p className="text-xs text-dark-500 font-body mt-4 text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            Plus assignment tracking, Pomodoro timer, course materials storage, and cloud sync.
            <react_router_dom_1.Link to="/features" className="text-green-400 ml-1 hover:text-green-300">See all features →</react_router_dom_1.Link>
          </framer_motion_1.motion.p>
        </section>

        {/* What is coming */}
        <section className="pb-16">
          <SectionLabel>What's Coming</SectionLabel>
          <h2 className="text-2xl font-black text-white font-display mb-3" style={{ letterSpacing: '-0.8px' }}>
            The roadmap ahead.
          </h2>
          <p className="text-sm text-dark-400 font-body leading-relaxed mb-6">
            StudiByte is actively developed. Features currently planned for future releases include:
          </p>
          <div className="space-y-2">
            {[
            'Past questions library organised by course and institution',
            'Collaborative study groups with shared materials',
            'AI-powered document search across uploaded materials',
            'Deeper AI integration — ask questions about your own notes',
            'Lecturer portal for distributing materials to students',
            'Academic calendar with exam schedule integration',
        ].map((item, i) => (<framer_motion_1.motion.div key={item} className="flex gap-2 items-start py-2.5 border-b border-white/5" initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0 mt-1.5"/>
                <p className="text-sm text-dark-300 font-body">{item}</p>
              </framer_motion_1.motion.div>))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16">
          <framer_motion_1.motion.div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(168,85,247,0.07))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-black text-white font-display mb-2">Ready to get started?</h2>
            <p className="text-xs text-dark-400 font-body mb-5 max-w-xs mx-auto leading-relaxed">
              Create a free account and set up your academic profile in under 10 minutes.
            </p>
            <react_router_dom_1.Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-dark-950" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              Start for Free <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </framer_motion_1.motion.div>
        </section>
      </div>
    </PublicLayout_1.default>);
}
//# sourceMappingURL=About.js.map