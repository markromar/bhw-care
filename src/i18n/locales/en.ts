/**
 * English UI strings. This file defines the key structure.
 * The Tagalog file (tl.ts) is type-checked against this shape.
 */
export const en = {
  app: {
    name: 'BHW Care',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    retry: 'Try again',
    back: 'Back',
  },
  sync: {
    synced: 'Synced',
    savedOnDevice: 'Saved on device',
    pendingSync: 'Pending sync',
    syncing: 'Syncing',
    syncFailed: 'Sync failed',
  },
  settings: {
    language: 'Language',
    languageEnglish: 'English',
    languageTagalog: 'Tagalog',
  },
  auth: {
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    email: 'Email',
    password: 'Password',
    signInFailed: 'Sign-in failed. Check your email and password.',
    signOut: 'Sign out',
    noRole: 'Your account has no role yet. Please contact your health center.',
    invalidScope: 'Your account needs review. Please contact your health center.',
    chooseRole: 'Choose how you want to continue',
    mfaTitle: 'Verify your identity',
    mfaFailed: 'That code was not accepted. Please try again.',
  },
  roles: {
    super_admin: 'Super Admin',
    kapitan: 'Barangay Kapitan',
    admin: 'Admin',
    bhw_head: 'BHW Head',
    bhw: 'BHW',
    rhu_nurse: 'RHU Nurse',
    pregnant_mother: 'Pregnant Mother',
    guardian: 'Parent / Guardian',
  },
  home: {
    roleLabel: 'Role',
    layoutLabel: 'Layout',
    layoutDrawer: 'Drawer',
    layoutBottomTabs: 'Bottom tabs',
    placeholderNote: 'Temporary role home. Real dashboards come later.',
  },
  nav: {
    home: 'Home',
    profile: 'Profile',
  },
  record: {
    checking: 'Checking access…',
    denied: 'You do not have access to this record.',
    notAvailable: 'This record is not available.',
    offline: 'Internet connection required to verify access.',
  },
  security: {
    title: 'Security',
    twoFactor: 'Two-factor authentication',
    required: 'Required for your role',
    statusOff: 'Off',
    statusActive: 'Active',
    statusEnrollmentRequired: 'Setup required',
    statusVerificationRequired: 'Verification required',
    statusUnknown: 'Could not check',
    setupLater: 'Authenticator setup will be added in a later update.',
    setUp: 'Set up authenticator',
    scanQr: 'Scan this code with your authenticator app.',
    orEnterSecret: 'Or enter this code manually:',
    enterCode: '6-digit code',
    verify: 'Verify',
  },
};
