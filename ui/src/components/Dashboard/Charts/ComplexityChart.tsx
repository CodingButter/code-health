import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'

interface ComplexFunction {
  file: string
  line: number
  ruleId: string
  metric?: number
  message: string
}

interface ComplexityChartProps {
  functions: ComplexFunction[]
}

export function ComplexityChart({ functions }: ComplexityChartProps) {
  // Extract complexity metrics from messages
  const chartData = functions
    .filter(f => f.message.includes('Cognitive Complexity'))
    .map(f => {
      const match = f.message.match(/from (\d+) to/)
      const complexity = match ? parseInt(match[1]) : 15
      const fileName = f.file.split('/').pop() || f.file
      
      return {
        name: `${fileName}:${f.line}`,
        complexity,
        threshold: 15
      }
    })
    .slice(0, 10)

  if (chartData.length === 0) {
    return (
      <Card className="github-card">
        <CardHeader>
          <CardTitle>Complexity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No complexity issues found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="github-card">
      <CardHeader>
        <CardTitle>Complexity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="complexity" 
              stroke="#fb8500" 
              fill="#fb8500" 
              fillOpacity={0.3}
              name="Complexity"
            />
            <Area 
              type="monotone" 
              dataKey="threshold" 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.1}
              strokeDasharray="5 5"
              name="Threshold"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}