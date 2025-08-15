import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'

interface CodebaseCompositionProps {
  composition?: {
    totalFiles: number
    totalLines: number
    codeLines: number
    commentLines: number
    blankLines: number
    avgFileSize: number
    medianFileSize: number
    languages: Array<{
      name: string
      files: number
      lines: number
      percentage: number
    }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1']

export function CodebaseComposition({ composition }: CodebaseCompositionProps) {
  if (!composition) {
    return (
      <Card className="github-card">
        <CardHeader>
          <CardTitle>Codebase Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            No composition data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for pie chart
  const pieData = [
    { name: 'Code', value: composition.codeLines, color: '#22c55e' },
    { name: 'Comments', value: composition.commentLines, color: '#3b82f6' },
    { name: 'Blank', value: composition.blankLines, color: '#94a3b8' }
  ]

  // Language breakdown data
  const languageData = composition.languages.slice(0, 5) // Top 5 languages

  return (
    <Card className="github-card col-span-2">
      <CardHeader>
        <CardTitle>Codebase Composition</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Type Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Line Type Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name}: ${((percent || 0) * 100).toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number) => value.toLocaleString()}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Files</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {composition.totalFiles.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Lines</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {composition.totalLines.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg File Size</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {composition.avgFileSize.toLocaleString()} lines
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Median File Size</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {composition.medianFileSize.toLocaleString()} lines
                </p>
              </div>
            </div>
          </div>

          {/* Language Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Language Distribution</h4>
            {languageData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => 
                        `${name}: ${percentage}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="lines"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                        border: '1px solid',
                        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                        borderRadius: '6px'
                      }}
                      formatter={(value: number) => value.toLocaleString() + ' lines'}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Language List */}
                <div className="space-y-2 mt-4">
                  {languageData.map((lang, index) => (
                    <div key={lang.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-700 dark:text-gray-300">{lang.name}</span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {lang.files} files • {lang.lines.toLocaleString()} lines
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                No language data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}