import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'

interface FileData {
  file: string
  loc: number
  code: number
  comment: number
  blank: number
}

interface FileDistributionProps {
  files: FileData[]
  limit?: number
}

export function FileDistribution({ files, limit = 10 }: FileDistributionProps) {
  const chartData = files.slice(0, limit).map(file => ({
    name: file.file.split('/').pop() || file.file,
    code: file.code,
    comment: file.comment,
    blank: file.blank
  }))

  return (
    <Card className="github-card">
      <CardHeader>
        <CardTitle>File Size Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="code" stackId="a" fill="#0969da" name="Code" />
            <Bar dataKey="comment" stackId="a" fill="#57606a" name="Comments" />
            <Bar dataKey="blank" stackId="a" fill="#d1d5db" name="Blank" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}