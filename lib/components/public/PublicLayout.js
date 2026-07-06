"use strict";
// src/components/public/PublicLayout.tsx
//
// Shared wrapper for all public pages.
// Provides: SEO meta injection, consistent nav, consistent footer,
// scroll-to-top on route change, scroll-to-bottom button.
// Every public page renders inside this — zero duplication.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEOMeta = SEOMeta;
exports.PublicNav = PublicNav;
exports.PublicFooter = PublicFooter;
exports.default = PublicLayout;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
// ── SEO meta injection ────────────────────────────────────────────────────────
const CANONICAL_ORIGIN = 'https://studibyte.space';
function SEOMeta({ title, description }) {
    const location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(() => {
        document.title = title;
        const desc = document.querySelector('meta[name="description"]');
        if (desc) {
            desc.setAttribute('content', description);
        }
        else {
            const m = document.createElement('meta');
            m.name = 'description';
            m.content = description;
            document.head.appendChild(m);
        }
        // Self-referencing canonical for the current route (strip query/hash)
        const canonicalUrl = `${CANONICAL_ORIGIN}${location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '')}`;
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.setAttribute('href', canonicalUrl);
        }
        else {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            canonical.setAttribute('href', canonicalUrl);
            document.head.appendChild(canonical);
        }
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            ogUrl.setAttribute('content', canonicalUrl);
        }
        else {
            const m = document.createElement('meta');
            m.setAttribute('property', 'og:url');
            m.setAttribute('content', canonicalUrl);
            document.head.appendChild(m);
        }
    }, [title, description, location.pathname]);
    return null;
}
// ── Nav links ─────────────────────────────────────────────────────────────────
const NAV_LINKS = [
    { label: 'Features', to: '/features' },
    { label: 'About', to: '/about' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Support', to: '/support' },
];
// ── Public Nav ────────────────────────────────────────────────────────────────
function PublicNav({ onGetStarted }) {
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(false);
    const location = (0, react_router_dom_1.useLocation)();
    // Close menu on route change
    (0, react_1.useEffect)(() => setMenuOpen(false), [location.pathname]);
    return (<>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3" style={{
            background: 'rgba(5,8,10,0.88)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
        {/* Logo */}
        <react_router_dom_1.Link to="/" className="flex items-center gap-2 touch-manipulation">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
            <lucide_react_1.Sparkles size={13} className="text-dark-950"/>
          </div>
          <span className="text-sm font-black text-white font-display tracking-tight">StudiByte</span>
        </react_router_dom_1.Link>

        {/* Desktop links — hidden on small screens */}
        <div className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.map(l => (<react_router_dom_1.Link key={l.to} to={l.to} className={`text-xs font-semibold transition-colors font-body
                ${location.pathname === l.to ? 'text-green-400' : 'text-dark-400 hover:text-white'}`}>
              {l.label}
            </react_router_dom_1.Link>))}
        </div>

        <div className="flex items-center gap-2">
          {onGetStarted ? (<button onClick={onGetStarted} className="text-xs font-bold text-dark-950 bg-green-500 px-4 py-2 rounded-xl touch-manipulation active:scale-95 transition-transform">
              Get Started
            </button>) : (<react_router_dom_1.Link to="/" className="text-xs font-bold text-dark-950 bg-green-500 px-4 py-2 rounded-xl touch-manipulation active:scale-95 transition-transform">
              Get Started
            </react_router_dom_1.Link>)}
          {/* Hamburger — mobile only */}
          <button onClick={() => setMenuOpen(o => !o)} className="sm:hidden w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400">
            {menuOpen ? <lucide_react_1.X size={15}/> : <lucide_react_1.Menu size={15}/>}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <framer_motion_1.AnimatePresence>
        {menuOpen && (<framer_motion_1.motion.div className="fixed inset-0 z-40 pt-16" style={{ background: 'rgba(5,8,10,0.97)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col gap-1 px-5 pt-4">
              {NAV_LINKS.map((l, i) => (<framer_motion_1.motion.div key={l.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <react_router_dom_1.Link to={l.to} className={`block py-3.5 text-base font-bold font-display border-b border-white/5 transition-colors
                      ${location.pathname === l.to ? 'text-green-400' : 'text-white'}`}>
                    {l.label}
                  </react_router_dom_1.Link>
                </framer_motion_1.motion.div>))}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: NAV_LINKS.length * 0.05 + 0.1 }} className="pt-4">
                <react_router_dom_1.Link to="/" className="block w-full py-3.5 rounded-2xl font-bold text-sm text-dark-950 text-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  Get Started Free
                </react_router_dom_1.Link>
              </framer_motion_1.motion.div>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </>);
}
// ── Public Footer ─────────────────────────────────────────────────────────────
function PublicFooter() {
    return (<footer className="px-5 pt-8 pb-10 max-w-2xl mx-auto border-t border-white/5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <react_router_dom_1.Link to="/" className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
              <lucide_react_1.Sparkles size={11} className="text-dark-950"/>
            </div>
            <span className="text-sm font-black text-white font-display">StudiByte</span>
          </react_router_dom_1.Link>
          <p className="text-xs text-dark-500 font-body max-w-[180px] leading-relaxed">
            AI-powered academic platform for university and college students.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
          <div>
            <p className="text-[10px] font-bold text-dark-600 uppercase tracking-wider mb-1.5">Platform</p>
            {[
            { label: 'Features', to: '/features' },
            { label: 'About', to: '/about' },
            { label: 'FAQ', to: '/faq' },
            { label: 'Support', to: '/support' },
            { label: 'Contact', to: '/contact' },
        ].map(l => (<react_router_dom_1.Link key={l.to} to={l.to} className="block text-[11px] text-dark-500 hover:text-dark-300 transition-colors font-body mb-0.5">
                {l.label}
              </react_router_dom_1.Link>))}
          </div>
          <div>
            <p className="text-[10px] font-bold text-dark-600 uppercase tracking-wider mb-1.5">Legal</p>
            {[
            { label: 'Privacy', to: '/privacy' },
            { label: 'Terms', to: '/terms' },
        ].map(l => (<react_router_dom_1.Link key={l.to} to={l.to} className="block text-[11px] text-dark-500 hover:text-dark-300 transition-colors font-body mb-0.5">
                {l.label}
              </react_router_dom_1.Link>))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-dark-900/40 border border-white/5 mb-5">
        <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">About StudiByte</p>
        <p className="text-xs text-dark-600 font-body leading-relaxed">
          StudiByte is a free AI-powered student productivity platform. Our mission is to give every university student the tools they need — timetable planning, GPA tracking, assignment management, attendance monitoring, and AI study assistance — in one place. Supports 3.0, 4.0, and 5.0 CGPA scales. Works on Android, iOS, and desktop.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-dark-600 font-body">
          © {new Date().getFullYear()} StudiByte. All rights reserved.
        </p>
        <react_router_dom_1.Link to="/" className="text-[10px] text-green-500 font-bold font-body hover:text-green-400 transition-colors">
          Get Started Free
        </react_router_dom_1.Link>
      </div>
    </footer>);
}
// ── Public Layout wrapper ─────────────────────────────────────────────────────
function PublicLayout({ children, onGetStarted, title, description, }) {
    const location = (0, react_router_dom_1.useLocation)();
    const bottomRef = (0, react_1.useRef)(null);
    const [showScrollBtn, setShowScrollBtn] = (0, react_1.useState)(false);
    // Scroll to top on route change
    (0, react_1.useEffect)(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);
    // Scroll button logic
    (0, react_1.useEffect)(() => {
        const handle = () => {
            const dist = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
            setShowScrollBtn(dist > 300);
        };
        window.addEventListener('scroll', handle, { passive: true });
        handle();
        return () => window.removeEventListener('scroll', handle);
    }, []);
    return (<div className="min-h-screen bg-dark-950 overflow-x-hidden">
      <SEOMeta title={title} description={description}/>
      <PublicNav onGetStarted={onGetStarted}/>

      <main className="pt-14">
        {children}
      </main>

      <PublicFooter />

      {/* Scroll to bottom button */}
      <framer_motion_1.AnimatePresence>
        {showScrollBtn && (<framer_motion_1.motion.button onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="fixed bottom-6 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{
                background: 'rgba(17,24,28,0.88)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(34,197,94,0.3)',
            }} initial={{ opacity: 0, scale: 0.75, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.75, y: 8 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} whileTap={{ scale: 0.88 }} aria-label="Scroll to bottom">
            <lucide_react_1.ChevronDown size={17} className="text-green-400"/>
          </framer_motion_1.motion.button>)}
      </framer_motion_1.AnimatePresence>

      <div ref={bottomRef}/>
    </div>);
}
//# sourceMappingURL=PublicLayout.js.map