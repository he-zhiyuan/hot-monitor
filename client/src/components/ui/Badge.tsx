interface BadgeProps {
  children: React.ReactNode
  variant?: 'purple' | 'cyan' | 'green' | 'amber' | 'red' | 'gray'
  size?: 'sm' | 'md'
}

const variantStyles = {
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  red: 'bg-red-500/15 text-red-300 border-red-500/20',
  gray: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center border font-medium rounded-full ${variantStyles[variant]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {children}
    </span>
  )
}
