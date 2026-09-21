// Style files are handled by Metro and NativeWind when the app is built. TypeScript
// only needs to know that importing them is valid. These declarations are committed so
// the typecheck also works on a fresh checkout (such as CI), where generated files like
// expo-env.d.ts do not exist.
declare module '*.css';
