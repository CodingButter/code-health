import { useEffect, useRef, useState } from 'react'
import { AnalysisData } from './useAnalysisData'

interface WebSocketOptions {
  onUpdate?: (data: AnalysisData) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectInterval?: number
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<AnalysisData | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  
  const {
    onUpdate,
    onConnect,
    onDisconnect,
    reconnectInterval = 5000
  } = options

  const connect = () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        setIsConnected(true)
        onConnect?.()
        console.log('WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'analysis_update' && message.data) {
            setLastMessage(message.data)
            onUpdate?.(message.data)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        onDisconnect?.()
        console.log('WebSocket disconnected')
        
        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectInterval)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [url])

  return {
    isConnected,
    lastMessage,
    reconnect: connect,
    disconnect
  }
}