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
  welcome: '/welcome',
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
    examPrep: '/app/exam-prep',
    squads: '/app/squads',
  },
} as const;

export const PUBLIC_PATHS: string[] = [
  ROUTES.home, ROUTES.about, ROUTES.features, ROUTES.faq,
  ROUTES.contact, ROUTES.privacy, ROUTES.terms, ROUTES.support,
];

export const INNER_APP_PATHS: string[] = [
  ROUTES.app.gpa, ROUTES.app.timer, ROUTES.app.assignments,
  ROUTES.app.materials, ROUTES.app.ai, ROUTES.app.import,
  ROUTES.app.examPrep, ROUTES.app.squads,
];

// Prefix patterns for dynamic inner-app routes that aren't in the static
// exact-match list above (e.g. /app/squads/join/:squadId). Checked with
// startsWith, so keep entries as full path prefixes.
const INNER_APP_PATH_PREFIXES: string[] = [
  `${ROUTES.app.squads}/join`,
];

/**
 * True if `pathname` should hide the bottom nav — either an exact static
 * inner-app path, or one matching a dynamic inner-app prefix.
 */
export function isInnerAppPath(pathname: string): boolean {
  return INNER_APP_PATHS.includes(pathname)
    || INNER_APP_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// Routes handled entirely outside the student auth/onboarding gates in
// App.tsx — signing in here does not require or trigger student onboarding.
export const ADMIN_PATHS: string[] = [ROUTES.adminLogin, ROUTES.notificationsAdmin];