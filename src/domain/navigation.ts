import { ROLES, type Role } from './roles';

/**
 * Navigation manifest.
 *
 * The app ships a fixed registry of known navigation items. Configuration (later
 * supplied by the Super Admin studio) only chooses among registered items: which
 * are enabled and in what order. It can never add a screen the app does not have,
 * or show an item to a role the registry does not allow.
 *
 * This is UX only. Hiding a menu item never protects data; the database does.
 */

export type NavItemKey = 'home' | 'profile';

export type NavItemDefinition = {
  key: NavItemKey;
  routeName: string;
  labelKey: string;
  allowedRoles: readonly Role[];
};

export type NavItem = {
  key: NavItemKey;
  routeName: string;
  labelKey: string;
};

export type NavConfigEntry = {
  key: string;
  order: number;
  enabled: boolean;
};

export type NavConfig = Partial<Record<Role, readonly NavConfigEntry[]>>;

export const NAV_REGISTRY: readonly NavItemDefinition[] = [
  { key: 'home', routeName: 'index', labelKey: 'nav.home', allowedRoles: ROLES },
  { key: 'profile', routeName: 'profile', labelKey: 'nav.profile', allowedRoles: ROLES },
];

const DEFAULT_ENTRIES: readonly NavConfigEntry[] = [
  { key: 'home', order: 10, enabled: true },
  { key: 'profile', order: 20, enabled: true },
];

export const DEFAULT_NAV_CONFIG: Record<Role, readonly NavConfigEntry[]> = {
  super_admin: DEFAULT_ENTRIES,
  kapitan: DEFAULT_ENTRIES,
  admin: DEFAULT_ENTRIES,
  bhw_head: DEFAULT_ENTRIES,
  bhw: DEFAULT_ENTRIES,
  rhu_nurse: DEFAULT_ENTRIES,
  pregnant_mother: DEFAULT_ENTRIES,
  guardian: DEFAULT_ENTRIES,
};

function resolveEntries(
  entries: readonly NavConfigEntry[],
  role: Role,
  registry: readonly NavItemDefinition[],
): NavItem[] {
  const seen = new Set<string>();

  return [...entries]
    .sort((a, b) => a.order - b.order)
    .filter((entry) => entry.enabled)
    .flatMap((entry) => {
      const definition = registry.find((item) => item.key === entry.key);
      if (!definition || !definition.allowedRoles.includes(role) || seen.has(definition.key)) {
        return [];
      }
      seen.add(definition.key);
      return [
        {
          key: definition.key,
          routeName: definition.routeName,
          labelKey: definition.labelKey,
        },
      ];
    });
}

/**
 * Builds the navigation items for a role from configuration.
 * If configuration would leave the role with nothing to navigate, the default
 * items are used so a bad configuration can never lock a user out of the app.
 */
export function buildNavItems(
  role: Role,
  config: NavConfig = DEFAULT_NAV_CONFIG,
  registry: readonly NavItemDefinition[] = NAV_REGISTRY,
): NavItem[] {
  const configured = config[role];
  const items = configured ? resolveEntries(configured, role, registry) : [];

  if (items.length > 0) {
    return items;
  }
  return resolveEntries(DEFAULT_NAV_CONFIG[role], role, registry);
}
