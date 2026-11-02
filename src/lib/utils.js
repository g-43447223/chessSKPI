import { getLanguage, localeFor } from './i18n.js'

export function cn(...values) {
  return values.filter(Boolean).join(' ')
}

export function uid(prefix = 'id') {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  return `${prefix}_${random}`
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function toNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0)
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'tournament'
}

export function formatDate(value, options = {}) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(localeFor(getLanguage()), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralize(count, singular, plural = singular) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatPoints(value) {
  const number = round2(value)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([text], { type: mime }))
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.readAsText(file, 'utf-8')
  })
}

export function moveItem(list, from, to) {
  if (from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
