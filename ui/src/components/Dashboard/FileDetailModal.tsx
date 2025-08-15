import { useEffect, useState } from 'react'
import { X, FileText, AlertTriangle, GitBranch, Code, MessageSquare, Box, CheckCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Button } from '../ui/Button'
import { formatNumber } from '../../lib/utils'

interface FileDetail {
  metrics: {
    file: string
    loc: number
    code: number
    comment: number
    blank: number
    functions?: number
    avgFunctionLength?: number
    maxFunctionLength?: number
    complexity?: number
    dependencies?: number
    dependents?: number
  }
  eslintIssues: Array<{
    ruleId: string
    severity: number
    message: string
    line: number
    column: number
  }>
  dependencies: Array<{
    module: string
    circular: boolean
    valid: boolean
  }>
  dependents: string[]
  complexityIssues: Array<{
    line: number
    ruleId: string
    metric?: number
    message: string
  }>
  lineViolations: Array<{
    kind: 'file' | 'function'
    value: number
    limit: number
  }>
  deadCodeIssues: Array<{
    symbol?: string
    kind: 'file' | 'export'
  }>
  summary: {
    totalIssues: number
    hasCircularDeps: boolean
    isDeadCode: boolean
  }
}

interface FileDetailModalProps {
  file: string | null
  onClose: () => void
}

export function FileDetailModal({ file, onClose }: FileDetailModalProps) {
  const [details, setDetails] = useState<FileDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setDetails(null)
      return
    }

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/file-detail?file=${encodeURIComponent(file)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch file details')
        }
        const data = await response.json()
        setDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [file])

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">File Analysis</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">{file}</p>
            </div>
            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading file details...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {details && (
              <div className="space-y-6">
                {/* File Metrics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">File Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      icon={<FileText className="h-4 w-4" />}
                      label="Total Lines"
                      value={formatNumber(details.metrics.loc)}
                    />
                    <MetricCard
                      icon={<Code className="h-4 w-4" />}
                      label="Code Lines"
                      value={formatNumber(details.metrics.code)}
                      subtext={`${Math.round((details.metrics.code / details.metrics.loc) * 100)}%`}
                    />
                    <MetricCard
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Comments"
                      value={formatNumber(details.metrics.comment)}
                      subtext={`${Math.round((details.metrics.comment / details.metrics.loc) * 100)}%`}
                    />
                    <MetricCard
                      icon={<Box className="h-4 w-4" />}
                      label="Functions"
                      value={details.metrics.functions ? formatNumber(details.metrics.functions) : 'N/A'}
                    />
                  </div>

                  {details.metrics.avgFunctionLength && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <MetricCard
                        label="Avg Function Length"
                        value={`${details.metrics.avgFunctionLength} lines`}
                      />
                      <MetricCard
                        label="Max Function Length"
                        value={`${details.metrics.maxFunctionLength} lines`}
                      />
                      {details.metrics.complexity && (
                        <MetricCard
                          label="Max Complexity"
                          value={details.metrics.complexity.toString()}
                          color={details.metrics.complexity > 10 ? 'text-yellow-600 dark:text-yellow-400' : undefined}
                        />
                      )}
                    </div>
                  )}

                  {/* File Composition Chart */}
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-3 text-gray-900 dark:text-gray-100">File Composition</h4>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { 
                                name: 'Code Lines', 
                                value: details.metrics.code, 
                                color: '#22c55e',
                                percentage: Math.round((details.metrics.code / details.metrics.loc) * 100)
                              },
                              { 
                                name: 'Comments', 
                                value: details.metrics.comment, 
                                color: '#3b82f6',
                                percentage: Math.round((details.metrics.comment / details.metrics.loc) * 100)
                              },
                              { 
                                name: 'Blank Lines', 
                                value: details.metrics.blank, 
                                color: '#94a3b8',
                                percentage: Math.round((details.metrics.blank / details.metrics.loc) * 100)
                              }
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percentage }) => `${percentage}%`}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { color: '#22c55e' },
                              { color: '#3b82f6' },
                              { color: '#94a3b8' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                              border: '1px solid',
                              borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                              borderRadius: '6px',
                              color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151'
                            }}
                            formatter={(value, name) => [
                              `${value} lines (${Math.round((value as number / details.metrics.loc) * 100)}%)`,
                              name
                            ]}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                            formatter={(value) => (
                              <span style={{ color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151' }}>
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Dependencies */}
                {(details.metrics.dependencies || details.metrics.dependents) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Dependencies</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Imports ({details.metrics.dependencies || 0})
                        </p>
                        {details.dependencies.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {details.dependencies.map((dep, i) => (
                              <div key={i} className="text-sm">
                                <code className={`${dep.circular ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {dep.module}
                                  {dep.circular && ' (circular)'}
                                </code>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No imports</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Imported By ({details.metrics.dependents || 0})
                        </p>
                        {details.dependents.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {details.dependents.map((dep, i) => (
                              <div key={i} className="text-sm">
                                <code className="text-gray-600 dark:text-gray-400">{dep}</code>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Not imported</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues */}
                {details.summary.totalIssues > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                      Issues ({details.summary.totalIssues})
                    </h3>
                    
                    {/* ESLint Issues */}
                    {details.eslintIssues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ESLint Issues ({details.eslintIssues.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {details.eslintIssues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                issue.severity === 2 ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-gray-500 dark:text-gray-400">
                                    {issue.ruleId}
                                  </code>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Line {issue.line}:{issue.column}
                                  </span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">{issue.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Complexity Issues */}
                    {details.complexityIssues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Complexity Issues ({details.complexityIssues.length})
                        </h4>
                        <div className="space-y-2">
                          {details.complexityIssues.map((issue, i) => (
                            <div key={i} className="text-sm p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 dark:text-gray-300">Line {issue.line}</span>
                                {issue.metric && (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded">
                                    Complexity: {issue.metric}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{issue.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dead Code */}
                    {details.deadCodeIssues.length > 0 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                            This file contains dead code
                          </p>
                        </div>
                        {details.deadCodeIssues[0].symbol && (
                          <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                            Unused: {details.deadCodeIssues[0].symbol}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Status */}
                {details.summary.totalIssues === 0 && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-lg font-medium text-green-700 dark:text-green-300">
                      No issues detected in this file
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for metric cards
function MetricCard({ 
  icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon?: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: string
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-lg font-semibold ${color || 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
      )}
    </div>
  )
}