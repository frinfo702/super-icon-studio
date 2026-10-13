import type { GlyphName } from '../glyphs'
import { DEFAULT_METRICS, appearance, darkAppearance, type IconDef } from '../model'

type Seed = [name: string, identifier: string, glyph: GlyphName, card: string, glyphColor?: string]

const SEEDS: Seed[] = [
  ['Browser', 'browser', 'compass', '#0061FF'],
  ['Codex', 'codex', 'atom', '#3B3F6B'],
  ['Git Changes', 'gitChanges', 'git', '#34C759'],
  ['Shell', 'shell', 'terminal', '#1C1C1E', '#D4FF3F'],
  ['Superlogical', 'superlogical', 'spline', '#BEE9F7', '#0F5F6E'],
  ['Trailhead', 'trailhead', 'waypoints', '#4B4BE8'],
  ['Metrics', 'metrics', 'gauge', '#FF9500'],
  ['Storage', 'storage', 'database', '#8E8E93'],
  ['Secrets', 'secrets', 'key', '#AF52DE'],
  ['Mailbox', 'mailbox', 'mail', '#64D2FF'],
  ['Registry', 'registry', 'package', '#A2845E'],
  ['Scheduler', 'scheduler', 'timer', '#E91E63'],
  ['Webhooks', 'webhooks', 'zap', '#FFB020'],
  ['Auth', 'auth', 'fingerprint', '#C4241C'],
  ['Logs', 'logs', 'scan', '#1C1C1E'],
  ['Telemetry', 'telemetry', 'activity', '#30C79B'],
  ['Cloud Sync', 'cloudSync', 'cloud', '#64D2FF'],
  ['Backups', 'backups', 'drive', '#8E8E93'],
  ['Deploy', 'deploy', 'rocket', '#AF52DE'],
  ['Firewall', 'firewall', 'shield', '#1C1C1E'],
  ['Region', 'region', 'globe', '#0061FF'],
  ['Queue', 'queue', 'layers', '#4B4BE8'],
  ['Studio', 'studio', 'blocks', '#00C7BE'],
  ['Circuit', 'circuit', 'circuit', '#3B3F6B'],
]

export const ICONS: IconDef[] = SEEDS.map(([name, identifier, glyph, card, glyphColor], index) => ({
  id: `icon-${index}`,
  name,
  identifier,
  glyph,
  metrics: { ...DEFAULT_METRICS },
  light: appearance(card, glyphColor),
  dark: darkAppearance(card, glyphColor),
}))

export function blankIcon(index: number): IconDef {
  const card = ['#0061FF', '#34C759', '#FF9500', '#AF52DE', '#E91E63'][index % 5]
  return {
    id: `icon-new-${index}-${Date.now()}`,
    name: 'Untitled Icon',
    identifier: 'untitledIcon',
    glyph: 'box',
    metrics: { ...DEFAULT_METRICS },
    light: appearance(card),
    dark: darkAppearance(card),
  }
}
