import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
          
          // Size variants
          {
            'px-2 py-1 text-xs': size === 'sm',
            'px-3 py-1.5 text-sm': size === 'md',
            'px-4 py-2 text-base': size === 'lg',
          },
          
          // Color variants
          {
            'border border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100 hover:border-gray-400': variant === 'default',
            'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700': variant === 'primary',
            'bg-green-600 text-white border border-green-600 hover:bg-green-700 hover:border-green-700': variant === 'success',
            'bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700': variant === 'danger',
            'border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-50': variant === 'outline',
            'border-none bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900': variant === 'ghost',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }