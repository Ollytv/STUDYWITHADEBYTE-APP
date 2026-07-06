"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contact = Contact;
exports.Privacy = Privacy;
exports.Terms = Terms;
exports.Support = Support;
// src/pages/public/Contact.tsx
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
function Contact() {
    return (<PublicLayout_1.default title="Contact StudiByte — Get Help and Support" description="Contact the StudiByte team for help, feedback, bug reports, or partnership enquiries. Find support resources, expected response times, and links to the help centre.">
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16">
          <SectionLabel>Contact</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Get in touch.
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            We read every message. Whether you have a question about how a feature works, found a bug, want to share feedback, or are interested in a partnership — reach out and we will respond.
          </framer_motion_1.motion.p>
        </section>

        <section className="pb-16 space-y-4">
          {[
            {
                icon: lucide_react_1.Mail, color: '#22c55e', delay: 0,
                title: 'Email Support',
                desc: 'For account issues, bug reports, and general questions, email us directly. Include your account email address and a description of the issue.',
                detail: 'support@studibyte.app',
                sub: 'Best for: account help, technical issues, bug reports',
            },
            {
                icon: lucide_react_1.MessageSquare, color: '#60a5fa', delay: 0.07,
                title: 'Feature Requests & Feedback',
                desc: 'Have an idea for a feature that would improve StudiByte for students? We genuinely consider all suggestions. Send a brief description of the feature and the problem it would solve.',
                detail: 'feedback@studibyte.app',
                sub: 'Best for: feature suggestions, UX feedback, general product comments',
            },
            {
                icon: lucide_react_1.Clock, color: '#fbbf24', delay: 0.14,
                title: 'Response Times',
                desc: 'We aim to respond to all support emails within 48 hours on business days. Feature requests and feedback are reviewed weekly and used to inform the product roadmap.',
                detail: 'Monday – Friday, 9am – 6pm WAT',
                sub: 'Weekend messages are read on Monday morning',
            },
        ].map(item => (<framer_motion_1.motion.div key={item.title} className="p-5 rounded-2xl bg-dark-900/60 border border-white/6" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: item.delay }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                  <item.icon size={15} style={{ color: item.color }}/>
                </div>
                <h2 className="text-sm font-bold text-white font-display">{item.title}</h2>
              </div>
              <p className="text-xs text-dark-400 font-body leading-relaxed mb-2">{item.desc}</p>
              <p className="text-xs font-semibold text-white font-body">{item.detail}</p>
              <p className="text-[10px] text-dark-600 font-body mt-0.5">{item.sub}</p>
            </framer_motion_1.motion.div>))}
        </section>

        <section className="pb-16">
          <SectionLabel>Quick Links</SectionLabel>
          <h2 className="text-xl font-black text-white font-display mb-4" style={{ letterSpacing: '-0.5px' }}>
            Find answers faster.
          </h2>
          <div className="space-y-2">
            {[
            { icon: lucide_react_1.HelpCircle, color: '#a855f7', label: 'Browse the FAQ', to: '/faq', desc: 'Answers to the most common questions about features, GPA, and privacy.' },
            { icon: lucide_react_1.FileText, color: '#22d3ee', label: 'Support Centre', to: '/support', desc: 'Step-by-step guides for setting up and using StudiByte.' },
            { icon: lucide_react_1.ArrowRight, color: '#22c55e', label: 'Create a free account', to: '/', desc: 'Set up your timetable and GPA tracker in under 10 minutes.' },
        ].map(item => (<framer_motion_1.motion.div key={item.label} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <react_router_dom_1.Link to={item.to} className="flex items-center gap-3 p-4 rounded-2xl bg-dark-900/50 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                    <item.icon size={13} style={{ color: item.color }}/>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-display">{item.label}</p>
                    <p className="text-xs text-dark-500 font-body">{item.desc}</p>
                  </div>
                </react_router_dom_1.Link>
              </framer_motion_1.motion.div>))}
          </div>
        </section>
      </div>
    </PublicLayout_1.default>);
}
// ── Privacy ───────────────────────────────────────────────────────────────────
function Privacy() {
    const sections = [
        {
            title: 'What data StudiByte collects',
            content: `When you create a StudiByte account, we collect your email address and full name. These are used solely to create and identify your account. We do not collect any information beyond what you voluntarily enter into the platform — your timetable, GPA records, attendance history, assignment details, and uploaded materials are all data you create and control.

We do not collect device information beyond what Firebase Authentication requires for secure login. We do not collect location data. We do not use tracking cookies or third-party analytics that identify individual users.`,
        },
        {
            title: 'How your data is stored',
            content: `All data is stored in Google Firebase, which provides enterprise-grade security and reliability. Your profile and academic data are stored in Firestore, a NoSQL cloud database. Uploaded files are stored in Firebase Storage. Both services enforce encryption at rest and in transit.

Firestore security rules ensure that your data is accessible only to your authenticated account. It is architecturally impossible for one user to read or modify another user's data — this restriction is enforced at the database level, not just in the application.`,
        },
        {
            title: 'How your data is used',
            content: `Your data is used solely to provide the features of StudiByte to you. We use your timetable data to generate reminders. We use your course scores to calculate your GPA. We use your attendance records to show your percentage per course. We use your uploaded materials to display them to you.

We do not use your data for advertising. We do not use your academic performance data to profile you. We do not sell, rent, or share your data with any third party for any commercial purpose.`,
        },
        {
            title: 'AI and data',
            content: `When you use the AI Study Assistant, your messages are sent to Google Gemini via a secure serverless function. Your conversation content is used only to generate the AI's response in that session. StudiByte does not store AI conversation content for model training purposes and does not share it with third parties beyond what is required for the Gemini API to function.

Conversations are saved to your Firestore account so you can revisit them, and you can delete any conversation at any time.`,
        },
        {
            title: 'Data deletion',
            content: `You can delete your StudiByte account at any time from the Settings page. Deleting your account permanently removes your profile, timetable, GPA records, attendance history, assignments, materials, and all other data from our systems. We do not retain copies of deleted user data and do not archive deleted accounts.`,
        },
        {
            title: 'Changes to this policy',
            content: `If we make significant changes to this privacy policy, we will notify users via the app before the changes take effect. Continued use of StudiByte after a policy update constitutes acceptance of the revised policy.`,
        },
    ];
    return (<PublicLayout_1.default title="StudiByte Privacy Policy — How We Handle Your Academic Data" description="StudiByte privacy policy: what data we collect, how it is stored in Firebase, how it is used, and your rights including data deletion. We do not sell or share your data.">
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16">
          <SectionLabel>Privacy Policy</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Your data belongs to you.
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </framer_motion_1.motion.p>
        </section>

        <div className="space-y-8 pb-16">
          {sections.map((s, i) => (<framer_motion_1.motion.section key={s.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 }}>
              <h2 className="text-base font-bold text-white font-display mb-3">{s.title}</h2>
              {s.content.split('\n\n').map((para, pi) => (<p key={pi} className="text-sm text-dark-400 font-body leading-relaxed mb-3">{para}</p>))}
            </framer_motion_1.motion.section>))}
        </div>

        <div className="pb-16">
          <p className="text-xs text-dark-600 font-body">
            Questions about this policy? <react_router_dom_1.Link to="/contact" className="text-green-400 hover:text-green-300">Contact us</react_router_dom_1.Link>.
          </p>
        </div>
      </div>
    </PublicLayout_1.default>);
}
// ── Terms ─────────────────────────────────────────────────────────────────────
function Terms() {
    const sections = [
        {
            title: 'Acceptance of terms',
            content: 'By creating a StudiByte account or using the platform, you agree to these terms of service. If you do not agree to these terms, do not use StudiByte. These terms apply to all users of the platform regardless of how the platform is accessed.',
        },
        {
            title: 'Account registration',
            content: 'You must provide a valid email address and a password of at least 8 characters to create an account. You are responsible for maintaining the security of your account credentials. StudiByte uses Firebase Authentication for secure account management and does not have access to your password.',
        },
        {
            title: 'Acceptable use',
            content: `StudiByte is provided for legitimate academic use by students and educators. You agree not to use the platform to:

• Submit AI-generated content as your own academic work in violation of your institution's academic integrity policy
• Upload illegal, harmful, or copyrighted content without permission
• Attempt to access other users' data or circumvent the platform's security
• Use the platform for any purpose that violates applicable laws or regulations

We reserve the right to suspend or terminate accounts that violate these terms.`,
        },
        {
            title: 'Intellectual property',
            content: 'Content you upload to StudiByte — notes, materials, and other files — remains your property. You grant StudiByte a limited licence to store and display this content to you as part of the service. StudiByte does not claim ownership of any content you upload.',
        },
        {
            title: 'AI assistant',
            content: 'The AI Study Assistant is provided as a learning support tool. StudiByte does not guarantee the accuracy of AI responses. AI outputs should be reviewed critically and verified against authoritative sources. StudiByte is not responsible for academic outcomes resulting from reliance on AI-generated content.',
        },
        {
            title: 'Service availability',
            content: 'StudiByte is provided "as is" without warranties of any kind. We aim to maintain high availability but do not guarantee uninterrupted access. We are not liable for any loss or damage resulting from service interruptions, data loss, or inaccuracies in GPA calculations.',
        },
        {
            title: 'Changes to the service',
            content: 'We may update, modify, or discontinue features of StudiByte at any time. Where possible, we will provide advance notice of significant changes. Continued use of the platform after changes constitutes acceptance of the revised service.',
        },
        {
            title: 'Governing law',
            content: 'These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from use of StudiByte shall be subject to the jurisdiction of Nigerian courts.',
        },
    ];
    return (<PublicLayout_1.default title="StudiByte Terms of Service — Platform Usage Rules and Conditions" description="StudiByte terms of service covering account registration, acceptable use, intellectual property, AI assistant usage, data handling, and service availability.">
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16">
          <SectionLabel>Terms of Service</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Platform rules and conditions.
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </framer_motion_1.motion.p>
        </section>

        <div className="space-y-8 pb-16">
          {sections.map((s, i) => (<framer_motion_1.motion.section key={s.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 }}>
              <h2 className="text-base font-bold text-white font-display mb-3">{s.title}</h2>
              {s.content.split('\n\n').map((para, pi) => (<p key={pi} className="text-sm text-dark-400 font-body leading-relaxed mb-3 whitespace-pre-line">{para}</p>))}
            </framer_motion_1.motion.section>))}
        </div>

        <div className="pb-16">
          <p className="text-xs text-dark-600 font-body">
            Questions about these terms? <react_router_dom_1.Link to="/contact" className="text-green-400 hover:text-green-300">Contact us</react_router_dom_1.Link>.
          </p>
        </div>
      </div>
    </PublicLayout_1.default>);
}
// ── Support ───────────────────────────────────────────────────────────────────
function Support() {
    const guides = [
        {
            title: 'Getting started',
            steps: [
                { step: 'Create your account', desc: 'Go to the StudiByte homepage and click "Get Started." Enter your email address and a password of at least 8 characters. A verification email will be sent to your address.' },
                { step: 'Complete your academic profile', desc: 'After signing in, the onboarding screen asks for your full name, department, academic level, and CGPA scale (3.0, 4.0, or 5.0). This takes under two minutes and calibrates all calculations to your institution.' },
                { step: 'Build your timetable', desc: 'Navigate to the Timetable tab. Add your classes manually using the + button, or use the Import feature to extract your schedule from a PDF, Word document, or screenshot automatically.' },
                { step: 'Enable class reminders', desc: 'Go to Settings and enable push notifications. Choose whether you want reminders 10 minutes, 30 minutes, or 1 hour before each class. On iOS, Safari will request notification permission when you enable this setting.' },
            ],
        },
        {
            title: 'Tracking your GPA',
            steps: [
                { step: 'Open GPA Tracker', desc: 'Navigate to More → GPA Tracker. The tracker shows your current semester GPA and cumulative CGPA at the top of the screen.' },
                { step: 'Add a course result', desc: 'Tap the + button and enter the course name, course code, credit units, and your score out of 100. StudiByte automatically calculates the grade and grade point.' },
                { step: 'View your GPA', desc: 'Your semester GPA and CGPA update immediately. The academic classification (First Class, Second Class Upper, etc.) is displayed below the GPA figure.' },
                { step: 'Switch between semesters', desc: 'Use the semester switcher at the top of the GPA Tracker to view results from previous semesters or switch to a new semester.' },
            ],
        },
        {
            title: 'Installing StudiByte',
            steps: [
                { step: 'Android', desc: 'Open the StudiByte website in Google Chrome. Tap the three-dot menu in the top right corner. Select "Add to Home Screen" and tap Add. StudiByte appears on your home screen immediately.' },
                { step: 'iPhone', desc: 'Open the StudiByte website in Safari (not Chrome — Safari is required for PWA installation on iOS). Tap the Share button at the bottom of the screen. Scroll down and tap "Add to Home Screen." Tap Add.' },
                { step: 'Desktop', desc: 'Open StudiByte in Google Chrome or Microsoft Edge. Look for the install icon in the browser address bar (a screen with a down arrow). Click it and then click Install. StudiByte opens as a standalone app window.' },
            ],
        },
        {
            title: 'Using the AI Assistant',
            steps: [
                { step: 'Open AI Assistant', desc: 'Navigate to More → AI Study Assistant. The assistant opens with a welcome screen and six suggested starter prompts to get you started.' },
                { step: 'Ask a question', desc: 'Type your question in the input field at the bottom and press Enter or the send button. You can ask about any academic subject, request note summaries, or ask for practice questions.' },
                { step: 'Start a new conversation', desc: 'Tap the + button in the top right to start a fresh conversation. Previous conversations are saved and accessible via the history icon next to the + button.' },
                { step: 'Retry a failed message', desc: 'If a message fails to send (usually due to a connection issue), a Retry button appears below the error. Tap it to resend without retyping your message.' },
            ],
        },
    ];
    return (<PublicLayout_1.default title="StudiByte Support Centre — Setup Guides and Help Documentation" description="Step-by-step guides for using StudiByte: setting up your account, building your timetable, tracking GPA, installing the app on Android and iPhone, and using the AI study assistant.">
      <div className="max-w-2xl mx-auto px-5">
        <section className="py-16">
          <SectionLabel>Support Centre</SectionLabel>
          <framer_motion_1.motion.h1 className="text-[2rem] font-black text-white font-display mb-3 leading-tight" style={{ letterSpacing: '-1px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            How to use StudiByte.
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-sm text-dark-400 font-body leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            Step-by-step guides to help you get the most out of every feature. For questions not covered here, visit the <react_router_dom_1.Link to="/faq" className="text-green-400 hover:text-green-300">FAQ</react_router_dom_1.Link> or <react_router_dom_1.Link to="/contact" className="text-green-400 hover:text-green-300">contact us</react_router_dom_1.Link>.
          </framer_motion_1.motion.p>
        </section>

        <div className="space-y-10 pb-16">
          {guides.map((guide, gi) => (<framer_motion_1.motion.section key={guide.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-base font-black text-white font-display mb-4">{guide.title}</h2>
              <div className="space-y-3">
                {guide.steps.map((s, si) => (<div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-black text-green-400">{si + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white font-display mb-0.5">{s.step}</p>
                      <p className="text-xs text-dark-400 font-body leading-relaxed">{s.desc}</p>
                    </div>
                  </div>))}
              </div>
            </framer_motion_1.motion.section>))}
        </div>

        <section className="pb-16">
          <framer_motion_1.motion.div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(168,85,247,0.07))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-black text-white font-display mb-2">Still need help?</h2>
            <p className="text-xs text-dark-400 font-body mb-5 max-w-xs mx-auto">
              Our support team responds within 48 hours on business days.
            </p>
            <react_router_dom_1.Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-dark-950" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              Contact Support <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </framer_motion_1.motion.div>
        </section>
      </div>
    </PublicLayout_1.default>);
}
//# sourceMappingURL=PublicPages.js.map