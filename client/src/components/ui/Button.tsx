import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variantStyles = {
  primary: 'text-white hover:opacity-90 shadow-lg shadow-purple-500/20',
  secondary: 'text-slate-200 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5',
  ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
  danger: 'text-white hover:opacity-90 shadow-lg shadow-red-500/20',
}

const primaryBg = { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }
const dangerBg = { background: 'linear-gradient(135deg, #ef4444, #dc2626)' }

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-sm rounded-xl',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={variant === 'primary' ? { ...primaryBg, ...style } : variant === 'danger' ? { ...dangerBg, ...style } : style}
      className={`
        inline-flex items-center gap-2 font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
