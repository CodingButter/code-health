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
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'danger': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const healthLevel = getHealthLevel(score)
  const healthColor = getHealthColor(healthLevel)

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">Code Health Score</span>
          <span className={cn('text-2xl font-bold', healthColor)}>
            {score}%
          </span>
          <Badge variant={healthLevel} className="ml-2">
            {healthLevel === 'success' ? 'Healthy' : 
             healthLevel === 'warning' ? 'Needs Attention' : 'Critical'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>{filesAnalyzed} files analyzed</span>
          <span>•</span>
          <span>{totalIssues} issues found</span>
        </div>
      </div>
    </div>
  )
}