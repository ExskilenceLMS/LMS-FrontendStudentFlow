import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FaWifi, FaExclamationTriangle } from 'react-icons/fa'

const InternetInfo: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isChecking, setIsChecking] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkInternetConnection = useCallback(async () => {
    if (isChecking) return 
    
    setIsChecking(true)
    
    try {
      const controller = new AbortController()
      timeoutRef.current = setTimeout(() => {
        controller.abort()
      }, 5000)
      
      const response = await fetch('/robots.txt', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      setIsOnline(response.ok && response.status >= 200 && response.status < 300)
    } catch (error: any) {
      // Only set offline for actual network errors, not timeout aborts
      if (error && (error.name === 'AbortError' || error.message === 'Timeout')) {
        // Silent abort: just re-check next interval
        console.log('Internet check timeout - will retry on next interval');
      } else {
        setIsOnline(false)
      }
    } finally {
      setIsChecking(false)
    }
  }, []) 

  useEffect(() => {
    const handleOnline = () => {
      checkInternetConnection()
    }
    
    const handleOffline = () => {
       setIsOnline(false)
    }

    checkInternetConnection()
    intervalRef.current = setInterval(checkInternetConnection, 20000) // Check every 20 seconds

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const iconStyle = {
    animation: isOnline ? 'pulse 2s infinite' : 'blink 1s infinite'
  }

  return (
    <>
      <div 
        className={`position-fixed d-flex align-items-center justify-content-center rounded-circle shadow-sm bg-white border ${
          isOnline ? 'border-success' : 'border-danger'
        } ${isChecking ? 'opacity-75' : 'opacity-100'}`}
        style={{
          bottom: '12px',
          left: '12px',
          zIndex: 9999,
          width: '32px',
          height: '32px',
          borderWidth: '2px',
          transition: 'all 0.3s ease'
        }}
        title={isOnline ? 'Internet Connected' : 'No Internet Connection'}
      >
        {isOnline ? (
          <FaWifi 
            size={20} 
            className="text-success"
            style={iconStyle}
          />
        ) : (
          <FaExclamationTriangle 
            size={20} 
            className="text-danger"
            style={iconStyle}
          />
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}

export default InternetInfo