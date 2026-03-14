"use client";

interface ThemeSelectorProps {
  /** When true, use compact styling for headers (no margin, narrower width) */
  compact?: boolean;
}

export function ThemeSelector(_props: ThemeSelectorProps) {
  // Hidden: dark mode has readability issues in grids and modals
  return null;
}
