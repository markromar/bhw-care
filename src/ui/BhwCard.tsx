import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
};

export function BhwCard({ children }: Props) {
  return <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-4">{children}</View>;
}
