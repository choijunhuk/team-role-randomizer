const appBaseUrl = import.meta.env.BASE_URL || '/'
const logoSrc = `${appBaseUrl}teamrandom.png`

export default function BrandLogo({ className = '', href = appBaseUrl }) {
  const classes = ['brand', className].filter(Boolean).join(' ')

  return <a className={classes} href={href}>
    <img className="brand-logo" src={logoSrc} alt="" aria-hidden="true" />
    <strong>팀메이트</strong>
  </a>
}
