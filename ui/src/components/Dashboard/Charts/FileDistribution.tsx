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
  onFileClick?: (file: string) => void
}

export function FileDistribution({ files, limit = 10, onFileClick }: FileDistributionProps) {
  const chartData = files.slice(0, limit).map(file => ({
    name: file.file.split('/').pop() || file.file,
    fullPath: file.file,
    code: file.code,
    comment: file.comment,
    blank: file.blank
  }))

  const handleClick = (data: any) => {
    if (onFileClick && data?.activePayload?.[0]?.payload?.fullPath) {
      onFileClick(data.activePayload[0].payload.fullPath)
    }
  }

  return (
    <Card className="github-card">
      <CardHeader>
        <CardTitle>File Size Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData}
            onClick={handleClick}
            style={{ cursor: onFileClick ? 'pointer' : 'default' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#374151' : '#e1e4e8'} />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fontSize: 12, fill: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151' }}
            />
            <YAxis tick={{ fontSize: 12, fill: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                border: '1px solid',
                borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                borderRadius: '6px'
              }}
              labelStyle={{
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
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