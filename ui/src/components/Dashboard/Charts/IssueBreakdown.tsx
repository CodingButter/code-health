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
    { name: 'Complex Functions', value: complexFunctions, color: '#fb8500' },
    { name: 'Long Functions', value: maxLineViolations, color: '#fb923c' },
    { name: 'Circular Deps', value: cycles, color: '#dc2626' },
    { name: 'Dead Code', value: deadCode, color: '#facc15' }
  ].filter(item => item.value > 0)

  if (pieData.length === 0) {
    return (
      <Card className="github-card">
        <CardHeader>
          <CardTitle>Issue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
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
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => 
                `${name}: ${(percent * 100).toFixed(0)}%`
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
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span style={{ fontSize: 12 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}