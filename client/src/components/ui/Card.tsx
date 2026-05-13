interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'cyan' | 'amber' | 'green' | 'none'
  onClick?: () => void
}

const glowStyles = {
  cyan:  'hover:shadow-[0_0_28px_rgba(34,211,238,0.15)] hover:border-cyan-500/25',
  amber: 'hover:shadow-[0_0_28px_rgba(251,191,36,0.15)] hover:border-amber-500/25',
  green: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.15)] hover:border-emerald-500/25',
  none:  '',
}

export default function Card({ children, className = '', glow = 'none', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all duration-300 ${glow !== 'none' ? 'hover:scale-[1.01]' : ''} ${glowStyles[glow]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </div>
  )
}
