import { AlertTriangle } from 'lucide-react'
import { Badge } from '../../ui/Badge'

interface ComplexFunction {
  file: string
  line: number
  ruleId: string
  metric?: number
  message: string
}

interface MaxLineOffender {
  file: string
  kind: string
  value: number
  limit: number
}

interface IssuesTabProps {
  complexFunctions: ComplexFunction[]
  maxLineOffenders: MaxLineOffender[]
}

export function IssuesTab({ complexFunctions, maxLineOffenders }: IssuesTabProps) {
  return (
    <div className="space-y-6">
      {complexFunctions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Complex Functions ({complexFunctions.length})
          </h3>
          <div className="space-y-2">
            {complexFunctions.map((func, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <code className="text-sm font-mono text-gray-800">
                      {func.file}:{func.line}
                    </code>
                    <p className="text-sm text-gray-600 mt-1">{func.message}</p>
                  </div>
                  <Badge variant="warning" className="ml-2">
                    {func.ruleId}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {maxLineOffenders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Max Lines Violations ({maxLineOffenders.length})
          </h3>
          <div className="space-y-2">
            {maxLineOffenders.map((offender, index) => (
              <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <code className="text-sm font-mono text-gray-800">
                      {offender.file}
                    </code>
                    <p className="text-sm text-gray-600 mt-1">
                      {offender.kind}: {offender.value} lines (limit: {offender.limit}, +{offender.value - offender.limit})
                    </p>
                  </div>
                  <Badge variant="warning">
                    {offender.kind}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complexFunctions.length === 0 && maxLineOffenders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No complexity or line length issues detected
        </div>
      )}
    </div>
  )
}