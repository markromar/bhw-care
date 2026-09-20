import type { en } from './en';

/**
 * Tagalog UI strings (working draft).
 * Typed against the English file, so a missing or extra key is a TypeScript error.
 * Needs review by a Tagalog speaker before pilot use.
 */
export const tl: typeof en = {
  app: {
    name: 'BHW Care',
  },
  common: {
    loading: 'Naglo-load…',
    save: 'I-save',
    cancel: 'Kanselahin',
    retry: 'Subukan muli',
    back: 'Bumalik',
  },
  sync: {
    synced: 'Naka-sync na',
    savedOnDevice: 'Naka-save sa device',
    pendingSync: 'Naghihintay ng sync',
    syncing: 'Nagsi-sync',
    syncFailed: 'Nabigo ang sync',
  },
  settings: {
    language: 'Wika',
    languageEnglish: 'Ingles',
    languageTagalog: 'Tagalog',
  },
  auth: {
    signIn: 'Mag-sign in',
    signingIn: 'Nagsa-sign in…',
    email: 'Email',
    password: 'Password',
    signInFailed: 'Hindi nakapag-sign in. Suriin ang email at password.',
    signOut: 'Mag-sign out',
    noRole: 'Wala pang tungkulin ang inyong account. Makipag-ugnayan sa health center.',
    invalidScope: 'Kailangang suriin ang inyong account. Makipag-ugnayan sa health center.',
    chooseRole: 'Piliin kung paano magpapatuloy',
  },
  roles: {
    super_admin: 'Super Admin',
    kapitan: 'Kapitan ng Barangay',
    admin: 'Admin',
    bhw_head: 'Pinuno ng BHW',
    bhw: 'BHW',
    rhu_nurse: 'Nars ng RHU',
    pregnant_mother: 'Buntis na Ina',
    guardian: 'Magulang / Tagapag-alaga',
  },
  home: {
    roleLabel: 'Tungkulin',
    layoutLabel: 'Layout',
    layoutDrawer: 'Drawer',
    layoutBottomTabs: 'Bottom tabs',
    placeholderNote: 'Pansamantalang home. Darating ang tunay na dashboard.',
  },
};
