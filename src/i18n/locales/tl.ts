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
    mfaTitle: 'I-verify ang inyong pagkakakilanlan',
    mfaFailed: 'Hindi tinanggap ang code na iyon. Subukan muli.',
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
  nav: {
    home: 'Home',
    profile: 'Profile',
  },
  record: {
    checking: 'Sinusuri ang access…',
    denied: 'Wala kayong access sa record na ito.',
    notAvailable: 'Hindi available ang record na ito.',
    offline: 'Kailangan ng internet upang ma-verify ang access.',
  },
  security: {
    title: 'Seguridad',
    twoFactor: 'Two-factor authentication',
    required: 'Kailangan para sa inyong tungkulin',
    statusOff: 'Naka-off',
    statusActive: 'Aktibo',
    statusEnrollmentRequired: 'Kailangang i-set up',
    statusVerificationRequired: 'Kailangang i-verify',
    statusUnknown: 'Hindi masuri',
    setupLater: 'Idadagdag ang pag-set up ng authenticator sa susunod na update.',
    setUp: 'I-set up ang authenticator',
    scanQr: 'I-scan ang code na ito gamit ang inyong authenticator app.',
    orEnterSecret: 'O ilagay ang code na ito nang manu-mano:',
    enterCode: '6-digit na code',
    verify: 'I-verify',
  },
};
