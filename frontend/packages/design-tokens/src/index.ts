export const THEME_COLORS = {
  background: '#FAF9F5',
  sidebar: '#F4F3EE',
  surface: '#FFFFFF',
  primary: '#C15F3C',
  primaryAction: '#B65333',
  hover: '#A84E31',
  accent: '#D97757',
  text: '#141413',
  secondaryText: '#625F59',
  border: '#E8E6DC',
  success: '#476B3C',
  info: '#2F5C83',
  warning: '#996000',
  danger: '#B42318',
} as const;

export type ThemeColors = typeof THEME_COLORS;
