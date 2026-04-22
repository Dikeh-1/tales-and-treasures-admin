import type { PaletteMode } from '@mui/material/styles';

export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: { main: '#0f8aaf' },
          secondary: { main: '#f2992e' },
          background: { default: '#f5f9fc', paper: '#ffffff' },
          text: { primary: '#0f2440', secondary: '#4d647d' },
          divider: 'rgba(15, 72, 120, 0.14)',
        }
      : {
          primary: { main: '#38bdf8' },
          secondary: { main: '#f8b159' },
          background: { default: '#091325', paper: '#0f1d33' },
          text: { primary: '#e6edf8', secondary: '#9db0c8' },
          divider: 'rgba(157, 176, 200, 0.18)',
        }),
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 16px 34px rgba(11, 35, 61, 0.08)',
          border: '1px solid rgba(15, 72, 120, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: '1rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
        },
      },
    },
  },
});
