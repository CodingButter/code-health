import { useState, useEffect } from 'react'
import { RefreshCw, Moon, Sun } from 'lucide-react'

import { Button } from './components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs'
import { formatRelativeTime } from './lib/utils'

import { useAnalysisData } from './hooks/useAnalysisData'
import { useWebSocket } from './hooks/useWebSocket'
import { HealthScore } from './components/Dashboard/HealthScore'
import { MetricCards } from './components/Dashboard/MetricCards'
import { FileDistribution } from './components/Dashboard/Charts/FileDistribution'
import { IssueBreakdown } from './components/Dashboard/Charts/IssueBreakdown'
import { ComplexityChart } from './components/Dashboard/Charts/ComplexityChart'
import { CodebaseComposition } from './components/Dashboard/Charts/CodebaseComposition'
import { IssuesTab } from './components/Dashboard/Tabs/IssuesTab'
import { FileDetailModal } from './components/Dashboard/FileDetailModal'

export default function App() {
  const { data, loading, error, lastRefresh, refresh } = useAnalysisData()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  // WebSocket for live updates
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  const { isConnected } = useWebSocket(wsUrl, {
    onUpdate: () => {
      // The hook will handle the update internally
      console.log('Received WebSocket update')
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading analysis data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Failed to load analysis data</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No analysis data available</p>
      </div>
    )
  }

  // Calculate metrics
  const filesAnalyzed = data.largestFiles.length
  const linesOfCode = data.largestFiles.reduce((sum, file) => sum + file.loc, 0)
  const totalIssues = 
    data.complexFunctions.length + 
    data.maxLineOffenders.length + 
    data.cycles.length + 
    data.deadCode.length

  const healthScore = Math.max(0, Math.round(100 - (totalIssues / Math.max(filesAnalyzed, 1)) * 10))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="Code Health" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Code Health Dashboard
              </h1>
              {isConnected && (
                <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Last updated: {formatRelativeTime(lastRefresh)}
              </span>
              <Button 
                onClick={refresh} 
                variant="outline" 
                size="sm"
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Health Score Bar */}
      <HealthScore 
        score={healthScore}
        totalIssues={totalIssues}
        filesAnalyzed={filesAnalyzed}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Metric Cards */}
        <MetricCards
          filesAnalyzed={filesAnalyzed}
          linesOfCode={linesOfCode}
          complexFunctions={data.complexFunctions.length}
          maxLineViolations={data.maxLineOffenders.length}
          cycles={data.cycles.length}
          deadCode={data.deadCode.length}
        />

        {/* Codebase Composition */}
        <div className="mt-6">
          <CodebaseComposition composition={data.composition} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <FileDistribution 
            files={data.largestFiles} 
            onFileClick={setSelectedFile}
          />
          <IssueBreakdown
            complexFunctions={data.complexFunctions.length}
            maxLineViolations={data.maxLineOffenders.length}
            cycles={data.cycles.length}
            deadCode={data.deadCode.length}
          />
          <ComplexityChart functions={data.complexFunctions} />
        </div>

        {/* Detailed Tabs */}
        <div className="mt-6">
          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="github-tabs">
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="deadcode">Dead Code</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="mt-4">
              <IssuesTab
                complexFunctions={data.complexFunctions}
                maxLineOffenders={data.maxLineOffenders}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Largest Files</h3>
                <div className="space-y-2">
                  {data.largestFiles.slice(0, 20).map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={() => setSelectedFile(file.file)}
                    >
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{file.file}</code>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{file.loc} lines</span>
                        <span className="text-blue-600 dark:text-blue-400">{file.code} code</span>
                        <span className="text-green-600 dark:text-green-400">{file.comment} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="mt-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                {data.cycles.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No circular dependencies detected
                  </p>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Circular Dependencies</h3>
                    {data.cycles.map((cycle, index) => (
                      <div key={index} className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Cycle #{index + 1}</p>
                        {cycle.paths.map((path, pathIndex) => (
                          <div key={pathIndex} className="text-sm text-gray-700 dark:text-gray-300 ml-4">
                            {pathIndex > 0 && '↓ '}
                            <code>{path}</code>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="deadcode" className="mt-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                {data.deadCode.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No dead code detected
                  </p>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Unused Code</h3>
                    <div className="space-y-2">
                      {data.deadCode.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{item.file}</code>
                          <div className="flex items-center space-x-2">
                            {item.symbol && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">{item.symbol}</span>
                            )}
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {item.kind}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* File Detail Modal */}
      <FileDetailModal 
        file={selectedFile} 
        onClose={() => setSelectedFile(null)} 
      />
    </div>
  )
}