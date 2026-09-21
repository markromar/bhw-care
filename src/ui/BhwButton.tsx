import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-emerald-600 active:bg-emerald-700',
  secondary: 'border border-slate-300 bg-white active:bg-slate-100',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-800',
};

export function BhwButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  selected,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading, selected }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-6 ${
        CONTAINER[variant]
      } ${inactive ? 'opacity-50' : ''}`}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#334155'} /> : null}
      <Text className={`text-base font-semibold ${LABEL[variant]}`}>{label}</Text>
    </Pressable>
  );
}
