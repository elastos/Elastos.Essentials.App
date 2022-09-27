export type ThemeVariant = {
  color: string; // Main background color, eg: #RRGGBB
  boxColor?: string; // Box background color
  textColor?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
};

export type ThemeConfig = {
  key: string; // Unique key identifier on ui and preferences
  variants: {
    "light": ThemeVariant;
    "dark": ThemeVariant;
  }
  usesDarkMode: boolean; // Whether dark mode should be used with this theme color or not
}