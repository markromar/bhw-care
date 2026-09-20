import { en } from '../../i18n/locales/en';
import { tl } from '../../i18n/locales/tl';
import { buildNavItems, NAV_REGISTRY, type NavItemDefinition } from '../navigation';
import { ROLES } from '../roles';

function lookup(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current !== null && typeof current === 'object') {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

describe('buildNavItems', () => {
  it('gives every role Home then Profile by default', () => {
    for (const role of ROLES) {
      expect(buildNavItems(role).map((item) => item.key)).toEqual(['home', 'profile']);
    }
  });

  it('honors order and enabled flags from configuration', () => {
    const config = {
      bhw: [
        { key: 'home', order: 20, enabled: true },
        { key: 'profile', order: 10, enabled: true },
      ],
      guardian: [
        { key: 'home', order: 10, enabled: true },
        { key: 'profile', order: 20, enabled: false },
      ],
    };

    expect(buildNavItems('bhw', config).map((item) => item.key)).toEqual(['profile', 'home']);
    expect(buildNavItems('guardian', config).map((item) => item.key)).toEqual(['home']);
  });

  it('ignores keys that are not in the registry', () => {
    const config = {
      bhw: [
        { key: 'secret_admin_panel', order: 5, enabled: true },
        { key: 'home', order: 10, enabled: true },
      ],
    };

    expect(buildNavItems('bhw', config).map((item) => item.key)).toEqual(['home']);
  });

  it('lists a key only once', () => {
    const config = {
      bhw: [
        { key: 'home', order: 10, enabled: true },
        { key: 'home', order: 20, enabled: true },
      ],
    };

    expect(buildNavItems('bhw', config).map((item) => item.key)).toEqual(['home']);
  });

  it('drops an item the role is not allowed to see', () => {
    const registry: readonly NavItemDefinition[] = [
      { key: 'home', routeName: 'index', labelKey: 'nav.home', allowedRoles: ROLES },
      {
        key: 'profile',
        routeName: 'profile',
        labelKey: 'nav.profile',
        allowedRoles: ['super_admin'],
      },
    ];
    const config = {
      bhw: [
        { key: 'home', order: 10, enabled: true },
        { key: 'profile', order: 20, enabled: true },
      ],
    };

    expect(buildNavItems('bhw', config, registry).map((item) => item.key)).toEqual(['home']);
  });

  it('falls back to the default items when configuration leaves nothing visible', () => {
    const config = {
      bhw: [
        { key: 'home', order: 10, enabled: false },
        { key: 'profile', order: 20, enabled: false },
      ],
    };

    expect(buildNavItems('bhw', config).map((item) => item.key)).toEqual(['home', 'profile']);
  });
});

describe('navigation labels', () => {
  it('has an English and a Tagalog label for every registered item', () => {
    for (const item of NAV_REGISTRY) {
      const english = lookup(en, item.labelKey);
      const tagalog = lookup(tl, item.labelKey);

      expect(typeof english).toBe('string');
      expect(english).not.toBe('');
      expect(typeof tagalog).toBe('string');
      expect(tagalog).not.toBe('');
    }
  });
});
