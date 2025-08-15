import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
          {
            'bg-gray-100 text-gray-800 border-gray-200': variant === 'default',
            'bg-green-100 text-green-800 border-green-200': variant === 'success',
            'bg-yellow-100 text-yellow-800 border-yellow-200': variant === 'warning',
            'bg-red-100 text-red-800 border-red-200': variant === 'danger',
            'bg-blue-100 text-blue-800 border-blue-200': variant === 'info',
            'bg-purple-100 text-purple-800 border-purple-200': variant === 'purple',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }