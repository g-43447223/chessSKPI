import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LANGUAGES } from '../lib/i18n'
import { cn, initials } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const BUTTON_VARIANTS = {
  primary:
    'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-emerald-600',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 hover:ring-slate-400 focus-visible:outline-slate-500',
  dark: 'bg-ink-900 text-white shadow-sm hover:bg-ink-800 focus-visible:outline-ink-900',
  subtle:
    'bg-slate-200/70 text-slate-800 hover:bg-slate-200 focus-visible:outline-slate-500',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600',
  'danger-ghost':
    'text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-rose-500',
  white:
    'bg-white text-ink-900 shadow-sm hover:bg-slate-100 focus-visible:outline-white',
  outlineWhite:
    'text-white ring-1 ring-white/30 ring-inset hover:bg-white/10 focus-visible:outline-white',
}

const BUTTON_SIZES = {
  xs: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-xl px-5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} size={size === 'lg' ? 18 : 16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'lg' ? 18 : 16} /> : null}
    </button>
  )
}

export function IconButton({ label, icon, variant = 'ghost', className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-40',
        BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.ghost,
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={17} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children, as: Tag = 'section', ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.18)]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ title, description, icon, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Badge({ tone = 'slate', className, children, dot = false }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    ink: 'bg-ink-900 text-white ring-ink-800',
  }
  const dots = {
    slate: 'bg-slate-400',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    ink: 'bg-emerald-400',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ring-inset',
        tones[tone] ?? tones.slate,
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} /> : null}
      {children}
    </span>
  )
}

export function Avatar({ name, className, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  }
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ring-1 ring-inset',
        tones[tone] ?? tones.slate,
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function ProgressBar({ value = 0, max = 100, tone = 'emerald', className }) {
  const { t } = useLanguage()
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const tones = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-700',
  }
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={t('common.percentComplete', { percent })}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'slate', className }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    rose: 'bg-rose-100 text-rose-700',
  }
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
            {label}
          </p>
          <p className="tabular mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <label className={cn('block', className)} htmlFor={htmlFor}>
      {label ? (
        <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-slate-700">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600">
          <Icon name="alert" size={13} className="mt-px shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={cn(inputClass, 'resize-y', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(inputClass, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={15}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        {label ? <p className="text-sm font-semibold text-slate-800">{label}</p> : null}
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
          checked ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function LanguageSwitch({ className }) {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div
      role="group"
      aria-label={t('language.aria')}
      className={cn(
        'inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs',
        className,
      )}
    >
      {LANGUAGES.map((item) => {
        const active = language === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setLanguage(item.value)}
            aria-pressed={active}
            title={item.label}
            className={cn(
              'inline-flex h-8 min-w-9 items-center justify-center rounded-lg px-2 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-500',
              active
                ? 'bg-ink-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            )}
          >
            {item.short}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const MODAL_SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon,
}) {
  const { t } = useLanguage()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => panelRef.current?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-5">
      <div
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-[3px]"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : t('common.dialog')}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-2xl',
          MODAL_SIZES[size] ?? MODAL_SIZES.md,
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Icon name={icon} size={19} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
          <IconButton label={t('common.close')} icon="x" onClick={onClose} className="-mr-1" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  icon = 'alert',
  busy = false,
  children,
}) {
  const { t } = useLanguage()
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      description={description}
      size="sm"
      icon={icon}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
            icon={busy ? 'refresh' : 'check'}
          >
            {busy ? t('common.working') : (confirmLabel ?? t('common.confirm'))}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export function Toasts({ toasts, onDismiss }) {
  const { t } = useLanguage()
  if (!toasts.length) return null
  const tones = {
    success: {
      box: 'border-emerald-200 bg-white',
      icon: 'bg-emerald-100 text-emerald-700',
      name: 'check',
    },
    error: {
      box: 'border-rose-200 bg-white',
      icon: 'bg-rose-100 text-rose-700',
      name: 'alert',
    },
    info: {
      box: 'border-slate-200 bg-white',
      icon: 'bg-slate-100 text-slate-700',
      name: 'info',
    },
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex flex-col items-center gap-2 sm:right-5 sm:bottom-5 sm:left-auto sm:items-end">
      {toasts.map((toast) => {
        const tone = tones[toast.tone] ?? tones.info
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg shadow-slate-900/10',
              tone.box,
            )}
          >
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.icon)}>
              <Icon name={tone.name} size={16} />
            </span>
            <p className="flex-1 pt-1 text-[13px] leading-snug font-medium text-slate-700">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={t('common.dismiss')}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

export function EmptyState({ icon = 'clipboard', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function SectionLabel({ children, className }) {
  return (
    <p
      className={cn(
        'text-[11px] font-bold tracking-[0.1em] text-slate-500 uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function InfoNote({ tone = 'slate', icon = 'info', children, className }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed', tones[tone], className)}>
      <Icon name={icon} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
