import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
> & {
  label: string;
};

export function BhwTextField({ label, ...inputProps }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-base font-medium text-slate-700">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
        {...inputProps}
      />
    </View>
  );
}
