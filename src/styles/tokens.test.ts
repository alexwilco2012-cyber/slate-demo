// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'

// Reads the real token values from tokens.css, so a colour change that breaks contrast fails here.
// (Read from disk: Vitest does not load CSS, even with ?raw.)
const tokensCss = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

type Theme = 'light' | 'dark'

function readTokens(css: string) {
  const tokens = new Map<string, Record<Theme, string>>()
  const pair = /--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi
  const single = /--([\w-]+):\s*(#[0-9a-f]{6});/gi
  for (const [, name, light, dark] of css.matchAll(pair)) {
    if (!tokens.has(name!)) tokens.set(name!, { light: light!, dark: dark! })
  }
  for (const [, name, value] of css.matchAll(single)) {
    if (!tokens.has(name!)) tokens.set(name!, { light: value!, dark: value! })
  }
  return tokens
}

function luminance(hex: string) {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}

const tokens = readTokens(tokensCss)

function value(name: string, theme: Theme) {
  const token = tokens.get(name)
  if (!token) throw new Error(`No hex token --${name} in tokens.css`)
  return token[theme]
}

const AA_TEXT: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-2'],
  ['brand', 'bg'],
  ['brand', 'surface'],
  ['brand', 'brand-tint'],
  ['on-brand', 'brand'],
  ['tenant-text', 'bg'],
  ['tenant-text', 'surface'],
  ['tenant-text', 'surface-2'],
  ['tenant-text', 'tenant-tint'],
  ['on-tenant', 'tenant'],
  ['landlord-text', 'bg'],
  ['landlord-text', 'surface'],
  ['landlord-text', 'surface-2'],
  ['landlord-text', 'landlord-tint'],
  ['on-landlord', 'landlord'],
  ['trade-text', 'bg'],
  ['trade-text', 'surface'],
  ['trade-text', 'surface-2'],
  ['trade-text', 'trade-tint'],
  ['on-trade', 'trade'],
  ['danger', 'bg'],
  ['danger', 'surface'],
  ['on-danger', 'danger'],
  // Outlined danger button and its hover fill.
  ['danger', 'critical-tint'],
  ['critical', 'critical-tint'],
  ['critical', 'surface'],
  ['positive', 'positive-tint'],
  ['positive', 'surface'],
  ['caution', 'caution-tint'],
  ['caution', 'surface'],
  ['info', 'info-tint'],
  ['info', 'surface'],
  ['muted', 'tenant-tint'],
  ['muted', 'landlord-tint'],
  ['muted', 'trade-tint'],
  ['muted', 'brand-tint'],
  ['ink', 'tenant-tint'],
  ['ink', 'landlord-tint'],
  ['ink', 'trade-tint'],
  ['bg', 'ink'],
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string] => ['ink', `avatar-${n}`]),
]

const NON_TEXT: [string, string][] = [
  ['input-border', 'bg'],
  ['input-border', 'surface'],
  ['score', 'bg'],
  ['score', 'surface'],
  ['tenant', 'bg'],
  ['landlord', 'bg'],
  // --accent-strong: radio dots, checked edges, tab underlines and step rings per role.
  ['brand', 'surface'],
  ['tenant', 'surface'],
  ['landlord', 'surface'],
  ['trade-text', 'surface'],
  ['trade-text', 'trade-tint'],
]

// Trade portal: essential text at 7:1 (SPEC §9 Hi-Vis rules).
const HIVIS_TEXT: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['muted-hivis', 'bg'],
  ['muted-hivis', 'surface'],
  ['muted-hivis', 'surface-2'],
  ['muted-hivis', 'trade-tint'],
  ['muted-hivis', 'brand-tint'],
  ['brand', 'brand-tint'],
  ['trade-text-hivis', 'bg'],
  ['trade-text-hivis', 'surface'],
  ['trade-text-hivis', 'trade-tint'],
  ['on-trade', 'trade'],
  ['tenant-text-hivis', 'surface'],
  ['tenant-text-hivis', 'tenant-tint'],
  ['landlord-text-hivis', 'surface'],
  ['landlord-text-hivis', 'landlord-tint'],
  ['danger-hivis', 'bg'],
  ['danger-hivis', 'surface'],
  ['danger-hivis', 'critical-tint'],
  ['on-danger', 'danger-hivis'],
  ['critical-hivis', 'critical-tint'],
  ['critical-hivis', 'surface'],
  ['positive-hivis', 'positive-tint'],
  ['positive-hivis', 'surface'],
  ['caution-hivis', 'caution-tint'],
  ['info-hivis', 'info-tint'],
  ['info-hivis', 'surface'],
]

const HIVIS_NON_TEXT: [string, string][] = [
  ['input-border-hivis', 'bg'],
  ['input-border-hivis', 'surface'],
  ['trade-text-hivis', 'surface'],
  ['trade-text-hivis', 'trade-tint'],
]

const THEMES: Theme[] = ['light', 'dark']

describe.each(THEMES)('%s tokens', (theme) => {
  it.each(AA_TEXT)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(contrast(value(fg, theme), value(bg, theme))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(NON_TEXT)('%s on %s meets 3:1', (fg, bg) => {
    expect(contrast(value(fg, theme), value(bg, theme))).toBeGreaterThanOrEqual(3)
  })

  it.each(HIVIS_TEXT)('trade: %s on %s meets 7:1', (fg, bg) => {
    expect(contrast(value(fg, theme), value(bg, theme))).toBeGreaterThanOrEqual(7)
  })

  it.each(HIVIS_NON_TEXT)('trade: %s on %s meets 3:1', (fg, bg) => {
    expect(contrast(value(fg, theme), value(bg, theme))).toBeGreaterThanOrEqual(3)
  })
})

it('keeps the SPEC §9 light palette exactly', () => {
  const spec: Record<string, string> = {
    bg: '#f7f2ea',
    surface: '#fffcf7',
    ink: '#2b2320',
    muted: '#6a5e55',
    'input-border': '#8c7f73',
    brand: '#1f3a34',
    tenant: '#a8401f',
    'tenant-tint': '#f8e4db',
    landlord: '#2f6a4f',
    'landlord-tint': '#ddede3',
    trade: '#e0a526',
    'trade-text': '#8a5a00',
    'trade-tint': '#fbefcf',
    danger: '#b3261e',
    score: '#c77700',
  }
  for (const [name, hex] of Object.entries(spec)) expect(value(name, 'light')).toBe(hex)
})

it('keeps the SPEC §9 dark palette exactly', () => {
  const spec: Record<string, string> = {
    bg: '#1b1714',
    surface: '#26201c',
    ink: '#f5eee6',
    muted: '#bfb2a6',
    tenant: '#f08a6c',
    landlord: '#7fc4a0',
    trade: '#f2c14e',
  }
  for (const [name, hex] of Object.entries(spec)) expect(value(name, 'dark')).toBe(hex)
})
