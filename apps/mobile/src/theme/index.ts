import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1B4F72',
    primaryContainer: '#D6EAF8',
    secondary: '#E67E22',
    secondaryContainer: '#FDEBD0',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#F8F9FA',
    error: '#C0392B',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
  },
  roundness: 12,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  headingLarge: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headingMedium: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  headingSmall: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.4 },
};
