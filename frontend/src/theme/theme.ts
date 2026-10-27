import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'
import { palette } from './palette'

// Shade 6 is the brand colour; shade 9 is navy.
const cobalt: MantineColorsTuple = [
  '#ebedfd',
  '#d3d7fa',
  '#a5aef3',
  '#7382ec',
  '#4a5de6',
  '#2a40dc',
  palette.cobalt,
  '#0819a0',
  '#06117a',
  palette.navy,
]

// Cool greys running from canvas to graphite.
const gray: MantineColorsTuple = [
  '#f7f8fc',
  palette.canvas,
  '#e2e3ec',
  '#cfd0da',
  palette.mist,
  '#9a9ba6',
  '#7d7f8b',
  '#5f6170',
  '#3f4150',
  palette.graphite,
]

// Mantine's dark scale: dark[7] is the page, dark[6] cards, dark[5] borders.
const dark: MantineColorsTuple = [
  '#e4e5ea',
  palette.mist,
  '#8d8f9b',
  '#5f6170',
  '#3a3c4a',
  palette.graphite,
  '#1d1f26',
  palette.ink,
  '#0e0f12',
  '#08090b',
]

export const theme = createTheme({
  primaryColor: 'cobalt',
  primaryShade: { light: 6, dark: 4 },
  colors: { cobalt, gray, dark },
  black: palette.ink,
  white: '#ffffff',
  fontFamily: "'Geist Variable', system-ui, sans-serif",
  fontFamilyMonospace: "'Geist Mono Variable', ui-monospace, monospace",
  headings: {
    fontFamily: "'Geist Variable', system-ui, sans-serif",
    fontWeight: '500',
  },
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '8px', md: '12px', lg: '20px', xl: '28px' },
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { radius: 'xl' } },
    ActionIcon: { defaultProps: { radius: 'xl' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Card: { defaultProps: { radius: 'lg' } },
  },
})

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': palette.canvas,
    '--app-surface': '#ffffff',
    '--app-border': '#e2e3ec',
  },
  dark: {
    '--mantine-color-body': palette.ink,
    '--app-surface': '#1d1f26',
    '--app-border': palette.graphite,
  },
})
