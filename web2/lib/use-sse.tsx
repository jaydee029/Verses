// "use client"

// import { useState, useEffect } from "react"

// type SSEOptions = {
//   onMessage?: (data: any) => void
//   addEventListener?: (data: any) => void
//   onError?: (error: any) => void
//   fallbackToFetch?: boolean
// }

// export function useSSE<T>(url: string, token: string | null, eventListener: string, options: SSEOptions = {}) {

//   const [data, setData] = useState<T | null>(null)
//   const [error, setError] = useState<Error | null>(null)
//   const [isConnected, setIsConnected] = useState(false)

//   useEffect(() => {
//     if (!token) return

//     let eventSource: EventSource | null = null
//     let abortController: AbortController | null = null

//     const connectSSE = () => {
//       try {
//         // Try to use SSE
//         console.log("Trying SSE")
//         console.log(url)
//         eventSource = new EventSource(`${url}?token=${token}`)

//         eventSource.onopen = () => {
//           console.log("connected")
//           setIsConnected(true)
//         }

//         // eventSource.onmessage = (event) => {
//         //   console.log("TEST")
//         //   console.log(event.data)
//         //   if (event.data.startsWith("data:")) {
//         //     try {
//         //       const parsedData = JSON.parse(event.data.replace(/^data: /, ""));
//         //       setData(parsedData);
//         //       options.onMessage?.(parsedData);
//         //     } catch (err) {
//         //       console.error("Error parsing SSE data", err);
//         //     }
//         //   } else {
//         //     console.warn("Received non-SSE data", event.data);
//         //   }
//         // };

//         eventSource.onmessage = (event) => {
//           console.log("DEFAULT SSE");
//           console.log(event.data);

//           try {
//             const parsedData = JSON.parse(event.data);
//             setData(parsedData);
//             options.onMessage?.(parsedData);
//           } catch (err) {
//             console.error("Error parsing SSE data", err);
//           }
//         };

//         // eventSource.addEventListener(eventListener, (event) => {
//         //   console.log("ADDING LISTENER ", eventListener)
//         //   try {
//         //     const parsedData = JSON.parse(event.data);
//         //     setData(parsedData);
//         //     options.onMessage?.(parsedData);
//         //   } catch (err) {
//         //     console.error("Error parsing SSE data", err);
//         //   }
//         // });


//         eventSource.onerror = (err) => {
//           console.log("ERRRRRRRR: ", url)
//           console.error("SSE error", err)
//           setError(new Error("SSE connection failed"))
//           options.onError?.(err)

//           // Close the connection
//           eventSource?.close()

//           // If fallback is enabled, try regular fetch
//           if (options.fallbackToFetch) {
//             fallbackToFetch()
//           }
//         }
//       } catch (err) {
//         console.error("Failed to connect to SSE", err)
//         setError(err instanceof Error ? err : new Error("Failed to connect to SSE"))

//         // If fallback is enabled, try regular fetch
//         if (options.fallbackToFetch) {
//           fallbackToFetch()
//         }
//       }
//     }

//     const fallbackToFetch = async () => {
//       try {
//         abortController = new AbortController()

//         const response = await fetch(url, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//           signal: abortController.signal,
//         })

//         if (!response.ok) {
//           throw new Error("Failed to fetch data")
//         }

//         const fetchedText = await response.text()
//         if (fetchedText.trim()) {
//           const fetchedData = JSON.parse(fetchedText);
//           setData(fetchedData)
//           options.onMessage?.(fetchedData)
//         }
//       } catch (err) {
//         if (err instanceof Error && err.name !== "AbortError") {
//           console.error("Fallback fetch error", err)
//           setError(err)
//           options.onError?.(err)
//         }
//       }
//     }

//     connectSSE()

//     return () => {
//       if (eventSource) {
//         eventSource.close()
//       }

//       if (abortController) {
//         abortController.abort()
//       }
//     }
//   }, [url, token])

//   return { data, error, isConnected }
// }

// lib/use-sse.tsx
import { useState, useEffect, useRef } from 'react';

interface SSEOptions<T> {
  onMessage?: (data: T) => void;
  fallbackToFetch?: boolean;
  onError?: (error: Error) => void;
}

export function useSSE<T>(
  url: string,
  token: string | null,
  eventName: string,
  options: SSEOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (!token) {
      setError(new Error('Authentication token is required'));
      return;
    }

    try {
      // Add token as query parameter for SSE connection
      const fullUrl = new URL(url, window.location.origin);
      fullUrl.searchParams.append('token', token);
      
      // Create EventSource connection
      const eventSource = new EventSource(fullUrl.toString(),{ withCredentials: true });
      
      // Listen for open events
      eventSource.onopen = () => {
        console.log(`SSE connection opened to ${url}`);
      };
      
      // Listen for specific event type
      eventSource.addEventListener(eventName, (event) => {
        try {
          console.log(`Received ${eventName} event:`, event);
          
          if (event.data) {
            console.log(event.data)

            const parsedData = JSON.parse(event.data) as T;
            setData(parsedData);
            options.onMessage?.(parsedData);
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          options.onError?.(error);
        }
      });
      
      // Listen for general error events
      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        const errorMessage = 'SSE connection failed or was closed';
        setError(new Error(errorMessage));
        
        if (options.onError) {
          options.onError(new Error(errorMessage));
        }
        
        // Close the connection on error
        eventSource.close();
        eventSourceRef.current = null;
        
        // Fallback to regular fetch if specified
        if (options.fallbackToFetch) {
          console.log('Falling back to regular fetch');
          fallbackFetch();
        }
      };
      
      // Cleanup function to close the EventSource connection
      return () => {
        console.log('Closing SSE connection');
        eventSource.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      console.error('Error setting up SSE:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      
      // Fallback to regular fetch if there was an error setting up SSE
      if (options.fallbackToFetch) {
        fallbackFetch();
      }
    }
    
    // Fallback fetch implementation
    async function fallbackFetch() {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Fallback fetch failed with status: ${response.status}`);
        }

        const responseText = await response.text();
        
        if (responseText){
          const responseData = JSON.parse(responseText)
          setData(responseData as T);
          options.onMessage?.(responseData as T);
        }

      } catch (err) {
        console.error('Fallback fetch error:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
      }
    }
  }, [url, token, eventName]);

  return { data, error };
