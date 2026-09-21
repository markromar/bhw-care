import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  centered?: boolean;
};

// Standard page: safe area, scrolling for small phones, padding and spacing.
export function BhwScreen({ children, centered = true }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className={`flex-1 gap-6 px-6 py-6 ${centered ? 'justify-center' : ''}`}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
