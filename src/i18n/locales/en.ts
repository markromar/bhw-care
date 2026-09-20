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
};
