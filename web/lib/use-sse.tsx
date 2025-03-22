"use client"

import { useState, useEffect } from "react"

type SSEOptions = {
  onMessage?: (data: any) => void
  onError?: (error: any) => void
  fallbackToFetch?: boolean
}

export function useSSE<T>(url: string, token: string | null, options: SSEOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token) return

    let eventSource: EventSource | null = null
    let abortController: AbortController | null = null

    const connectSSE = () => {
      try {
        // Try to use SSE
        eventSource = new EventSource(`${url}?token=${token}`)

        eventSource.onopen = () => {
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const parsedData = JSON.parse(event.data)
            setData(parsedData)
            options.onMessage?.(parsedData)
          } catch (err) {
            console.error("Error parsing SSE data", err)
          }
        }

        eventSource.onerror = (err) => {
          console.error("SSE error", err)
          setError(new Error("SSE connection failed"))
          options.onError?.(err)

          // Close the connection
          eventSource?.close()

          // If fallback is enabled, try regular fetch
          if (options.fallbackToFetch) {
            fallbackToFetch()
          }
        }
      } catch (err) {
        console.error("Failed to connect to SSE", err)
        setError(err instanceof Error ? err : new Error("Failed to connect to SSE"))

        // If fallback is enabled, try regular fetch
        if (options.fallbackToFetch) {
          fallbackToFetch()
        }
      }
    }

    const fallbackToFetch = async () => {
      try {
        abortController = new AbortController()

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }

        const fetchedData = await response.json()
        setData(fetchedData)
        options.onMessage?.(fetchedData)
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Fallback fetch error", err)
          setError(err)
          options.onError?.(err)
        }
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }

      if (abortController) {
        abortController.abort()
      }
    }
  }, [url, token])

  return { data, error, isConnected }
}

