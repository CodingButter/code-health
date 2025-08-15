import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'

interface IssueBreakdownProps {
  complexFunctions: number
  maxLineViolations: number
  cycles: number
  deadCode: number
}

export function IssueBreakdown({
  complexFunctions,
  maxLineViolations,
  cycles,
  deadCode
}: IssueBreakdownProps) {
  const pieData = [
    { name: 'Complex Functions', shortName: 'Complex', value: complexFunctions, color: '#fb8500' },
    { name: 'Long Functions', shortName: 'Long', value: maxLineViolations, color: '#fb923c' },
    { name: 'Circular Dependencies', shortName: 'Circular', value: cycles, color: '#dc2626' },
    { name: 'Dead Code', shortName: 'Dead Code', value: deadCode, color: '#facc15' }
  ].filter(item => item.value > 0)

  if (pieData.length === 0) {
    return (
      <Card className="github-card">
        <CardHeader>
          <CardTitle>Issue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            No issues detected - great job! 🎉
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="github-card">
      <CardHeader>
        <CardTitle>Issue Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart margin={{ top: 5, right: 5, bottom: 50, left: 5 }}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ payload, percent }) => 
                `${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={70}
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
                borderRadius: '6px',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151'
              }}
              formatter={(value, name) => [
                `${value} ${value === 1 ? 'issue' : 'issues'}`,
                name
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={40}
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span style={{ fontSize: 11, color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}