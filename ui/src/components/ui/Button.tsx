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
            'border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500': variant === 'default',
            'bg-blue-600 dark:bg-blue-500 text-white border border-blue-600 dark:border-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 hover:border-blue-700 dark:hover:border-blue-600': variant === 'primary',
            'bg-green-600 dark:bg-green-500 text-white border border-green-600 dark:border-green-500 hover:bg-green-700 dark:hover:bg-green-600 hover:border-green-700 dark:hover:border-green-600': variant === 'success',
            'bg-red-600 dark:bg-red-500 text-white border border-red-600 dark:border-red-500 hover:bg-red-700 dark:hover:bg-red-600 hover:border-red-700 dark:hover:border-red-600': variant === 'danger',
            'border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700': variant === 'outline',
            'border-none bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100': variant === 'ghost',
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