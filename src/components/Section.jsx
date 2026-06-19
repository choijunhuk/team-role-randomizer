export default function Section({ id, number, title, description, actions, children, className = '', showStep = true, embedded = false }) {
  // When embedded inside a Disclosure group, drop the panel chrome and the
  // redundant heading so the parent provides the single calm container.
  if (embedded) {
    // Omit the id when embedded — the parent Disclosure owns the scroll target
    // so nav anchors land on the (always-visible) accordion header.
    return (
      <div className={`section-embedded ${className}`}>
        {(description || actions) && (
          <header className="section-embedded-header">
            {description && <p>{description}</p>}
            {actions && <div className="section-actions">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    )
  }
  return (
    <section id={id} className={`panel ${className}`}>
      <header className="section-header">
        <div>
          {showStep && number && <span className="eyebrow">STEP {number}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
