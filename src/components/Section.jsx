export default function Section({ id, number, title, description, actions, children, className = '' }) {
  return (
    <section id={id} className={`panel ${className}`}>
      <header className="section-header">
        <div>
          <span className="eyebrow">STEP {number}</span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
