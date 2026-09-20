import { Stack } from 'expo-router';

import { buildNavItems } from '@/domain/navigation';
import { getShellKind } from '@/domain/roles';
import { useSessionStore } from '@/state/sessionStore';
import { BottomTabsShell } from '@/ui/shell/BottomTabsShell';
import { DrawerShell } from '@/ui/shell/DrawerShell';

// Chooses the shell for the signed-in role. This is UX routing only; the database
// decides what data any role can read or write.
export default function AppLayout() {
  const context = useSessionStore((state) => state.context);

  if (context === null || context.status !== 'ready') {
    // No resolved role yet: show only the role home, which explains the next step.
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  const items = buildNavItems(context.role);

  if (getShellKind(context.role) === 'drawer') {
    return <DrawerShell items={items} />;
  }
  return <BottomTabsShell items={items} />;
}
