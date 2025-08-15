import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  GitBranch,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '../ui/Card'
import { formatNumber } from '../../lib/utils'

interface MetricCardsProps {
  filesAnalyzed: number
  linesOfCode: number
  complexFunctions: number
  maxLineViolations: number
  cycles: number
  deadCode: number
}

export function MetricCards({
  filesAnalyzed,
  linesOfCode,
  complexFunctions,
  maxLineViolations,
  cycles,
  deadCode
}: MetricCardsProps) {
  const metrics = [
    {
      title: 'Files Analyzed',
      value: filesAnalyzed,
      icon: FileText,
      description: `${formatNumber(linesOfCode)} lines of code`,
      trend: null
    },
    {
      title: 'Complex Functions',
      value: complexFunctions,
      icon: AlertTriangle,
      description: 'Need refactoring',
      trend: complexFunctions > 0 ? 'up' : 'none',
      color: complexFunctions > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Long Functions',
      value: maxLineViolations,
      icon: AlertTriangle,
      description: 'Exceed line limits',
      trend: maxLineViolations > 0 ? 'up' : 'none',
      color: maxLineViolations > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Circular Dependencies',
      value: cycles,
      icon: GitBranch,
      description: cycles === 0 ? 'No cycles detected' : 'Dependency cycles',
      trend: cycles > 0 ? 'up' : 'none',
      color: cycles === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Dead Code',
      value: deadCode,
      icon: CheckCircle,
      description: deadCode === 0 ? 'No unused code' : 'Unused exports',
      trend: deadCode > 0 ? 'up' : 'none',
      color: deadCode === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
    }
  ]

  const getTrendIcon = (trend: string | null) => {
    if (!trend) return null
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500 dark:text-red-400" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500 dark:text-green-400" />
      default:
        return <Minus className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="github-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>{metric.title}</span>
                <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-bold ${metric.color || 'text-gray-900 dark:text-gray-100'}`}>
                  {formatNumber(metric.value)}
                </p>
                {getTrendIcon(metric.trend)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}