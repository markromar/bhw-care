import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  centered?: boolean;
};

// Standard page: safe area, horizontal padding and spacing between children.
export function BhwScreen({ children, centered = true }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className={`flex-1 gap-6 px-6 ${centered ? 'justify-center' : 'pt-6'}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
