'use client'

import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useWebSocket } from '@/lib/websocket/websocket.service'

export function WebSocketIndicator() {
  const { isConnected, isConnecting, error, reconnectAttempts } = useWebSocket()

  if (isConnecting) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          <span className="text-xs text-gray-500">
            {reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts})` : 'Connecting'}
          </span>
        </div>
      </div>
    )
  }

  if (error && !isConnected) {
    return (
      <div className="flex items-center space-x-2" title={`Connection error: ${error}`}>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <WifiOff className="w-4 h-4 text-red-600" />
          <span className="text-xs text-red-600">Offline</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {isConnected ? (
        <div className="flex items-center space-x-1" title="Real-time connection active">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <Wifi className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-600">Live</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1" title="No real-time connection">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <WifiOff className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Offline</span>
        </div>
      )}
    </div>
  )
}