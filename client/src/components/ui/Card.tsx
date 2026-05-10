interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'purple' | 'cyan' | 'green' | 'none'
  onClick?: () => void
}

const glowStyles = {
  purple: 'hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:border-purple-500/30',
  cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:border-cyan-500/30',
  green: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:border-emerald-500/30',
  none: '',
}

export default function Card({ children, className = '', glow = 'none', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all duration-300 ${glow !== 'none' ? 'hover:scale-[1.01]' : ''} ${glowStyles[glow]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </div>
  )
}
