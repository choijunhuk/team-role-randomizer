import { useEffect, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Calm, accessible progressive-disclosure container.
 * Groups secondary tools so the default workspace stays focused on the core flow.
 * Controlled via `defaultOpen`; remembers nothing across reloads on purpose.
 */
export default function Disclosure({
  id,
  icon: Icon,
  title,
  hint,
  badge,
  defaultOpen = false,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  // Auto-open when a nav anchor (#id) targets this group, so the content the
  // user jumped to is actually visible.
  useEffect(() => {
    if (!id) return undefined
    const openIfTargeted = () => { if (location.hash === `#${id}`) setOpen(true) }
    openIfTargeted()
    window.addEventListener('hashchange', openIfTargeted)
    return () => window.removeEventListener('hashchange', openIfTargeted)
  }, [id])

  return (
    <section id={id} className={`disclosure ${open ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="disclosure-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="disclosure-label">
          {Icon && <Icon size={16} aria-hidden="true" />}
          <span>
            <strong>{title}</strong>
            {hint && <small>{hint}</small>}
          </span>
        </span>
        <span className="disclosure-meta">
          {badge != null && badge !== 0 && <em className="disclosure-badge">{badge}</em>}
          <ChevronDown className="disclosure-chevron" size={18} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="disclosure-body" id={panelId}>
          {children}
        </div>
      )}
    </section>
  )
}
