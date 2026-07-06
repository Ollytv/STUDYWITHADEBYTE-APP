export const ROUTES = {
  home: '/',
  about: '/about',
  features: '/features',
  faq: '/faq',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  support: '/support',
  auth: '/auth',
  onboarding: '/onboarding',
  adminLogin: '/admin-login',
  notificationsAdmin: '/notificationsAdmin',
  app: {
    root: '/app',
    timetable: '/app/timetable',
    attendance: '/app/attendance',
    more: '/app/more',
    settings: '/app/settings',
    gpa: '/app/gpa',
    timer: '/app/timer',
    assignments: '/app/assignments',
    materials: '/app/materials',
    import: '/app/import',
    ai: '/app/ai',
  },
} as const;

export const PUBLIC_PATHS: string[] = [
  ROUTES.home, ROUTES.about, ROUTES.features, ROUTES.faq,
  ROUTES.contact, ROUTES.privacy, ROUTES.terms, ROUTES.support,
];

export const INNER_APP_PATHS: string[] = [
  ROUTES.app.gpa, ROUTES.app.timer, ROUTES.app.assignments,
  ROUTES.app.materials, ROUTES.app.ai, ROUTES.app.import,
];

// Routes handled entirely outside the student auth/onboarding gates in
// App.tsx — signing in here does not require or trigger student onboarding.
export const ADMIN_PATHS: string[] = [ROUTES.adminLogin, ROUTES.notificationsAdmin];