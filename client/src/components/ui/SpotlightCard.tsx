/**
 * Aceternity-inspired Spotlight Card
 * Radial gradient follows the mouse — purely CSS, no dependencies
 */
import { useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  spotColor?: string
  onClick?: () => void
}

export default function SpotlightCard({
  children,
  className = '',
  spotColor = 'rgba(34,211,238,0.06)',
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      onClick={onClick}
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {/* spotlight overlay */}
      {pos && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${pos.x}px ${pos.y}px, ${spotColor}, transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
