import { Star } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

interface HealthScoreProps {
  score: number
  totalIssues: number
  filesAnalyzed: number
}

export function HealthScore({ score, totalIssues, filesAnalyzed }: HealthScoreProps) {
  const getHealthLevel = (score: number) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'danger'
  }

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'danger': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const healthLevel = getHealthLevel(score)
  const healthColor = getHealthColor(healthLevel)

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Code Health Score</span>
          <span className={cn('text-2xl font-bold', healthColor)}>
            {score}%
          </span>
          <Badge variant={healthLevel} className="ml-2">
            {healthLevel === 'success' ? 'Healthy' : 
             healthLevel === 'warning' ? 'Needs Attention' : 'Critical'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{filesAnalyzed} files analyzed</span>
          <span>•</span>
          <span>{totalIssues} issues found</span>
        </div>
      </div>
    </div>
  )
}