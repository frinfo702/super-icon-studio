export function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value
  const n = Number.parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(n)) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export function normalizeHex(input: string): string | null {
  const value = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) return `#${value.replace(/./g, (c) => c + c).toUpperCase()}`
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toUpperCase()}`
  return null
}
