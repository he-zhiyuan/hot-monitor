interface BadgeProps {
  children: React.ReactNode
  variant?: 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'blue' | 'pink' | 'gray' | 'ghost'
  size?: 'sm' | 'md'
}

const styles: Record<string, string> = {
  cyan:   'bg-cyan-500/10    text-cyan-400    border-cyan-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber:  'bg-amber-500/10   text-amber-400   border-amber-500/20',
  red:    'bg-red-500/10     text-red-400     border-red-500/25',
  purple: 'bg-violet-500/10  text-violet-400  border-violet-500/20',
  blue:   'bg-blue-500/10    text-blue-400    border-blue-500/20',
  pink:   'bg-pink-500/10    text-pink-400    border-pink-500/20',
  gray:   'bg-white/5        text-slate-500   border-white/8',
  ghost:  'bg-transparent    text-slate-600   border-white/6',
}

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium font-mono tracking-wide ${sizeClass} ${styles[variant]}`}
    >
      {children}
    </span>
  )
}
