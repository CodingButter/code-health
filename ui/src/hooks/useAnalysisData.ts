import { useState, useEffect } from 'react'

export interface AnalysisData {
  largestFiles: Array<{
    file: string
    loc: number
    code: number
    comment: number
    blank: number
  }>
  complexFunctions: Array<{
    file: string
    line: number
    ruleId: string
    metric?: number
    message: string
  }>
  maxLineOffenders: Array<{
    file: string
    kind: string
    value: number
    limit: number
  }>
  cycles: Array<{
    paths: string[]
  }>
  deadCode: Array<{
    file: string
    symbol?: string
    kind: string
  }>
  generatedAt: string
}

export function useAnalysisData(refreshInterval = 30000) {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = async () => {
    try {
      setError(null)
      const response = await fetch('/api/stats')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setLastRefresh(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(message)
      console.error('Failed to fetch analysis data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return {
    data,
    loading,
    error,
    lastRefresh,
    refresh: fetchData
  }
}