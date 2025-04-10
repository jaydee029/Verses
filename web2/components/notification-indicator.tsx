"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-hooks"
import { useSSE } from "@/lib/use-sse"

type NotificationIndicatorProps = {
  className?: string
}

export function NotificationIndicator({ className = "" }: NotificationIndicatorProps) {
  const [hasUnread, setHasUnread] = useState(false)
  const { token } = useAuth()

  // Use SSE to check for unread notifications
  const { data } = useSSE<{ has_unread: boolean }>("/api/sse/notifications", token, "notification", {
    onMessage: (data) => {
      if (data && Array.isArray(data)) {
        setHasUnread(data.some((notification) => !notification.read))
      }
    },
    fallbackToFetch: true,
  })

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setHasUnread(data.some((notification) => !notification.read))
    }

    // Fallback: check for unread notifications on mount
    const checkUnread = async () => {
      try {
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const text = await response.text()
          if (text.trim()){
            const data = JSON.parse(text)
          if (data!=null){
          setHasUnread(data.some((notification: any) => !notification.read))
          } 
          }
          else {
            setHasUnread(false)
          }
        }
      } catch (err) {
        console.error("Failed to check unread notifications", err)
      }
    }

    checkUnread()
  }, [data, token])

  if (!hasUnread) return null

  return <div className={`h-2 w-2 rounded-full bg-red-500 ${className}`} />
}

// "use client";

// import { useState, useEffect } from "react";
// import { useAuth } from "@/lib/auth-hooks";

// type NotificationIndicatorProps = {
//   className?: string;
// };

// export function NotificationIndicator({ className = "" }: NotificationIndicatorProps) {
//   const [hasUnread, setHasUnread] = useState(false);
//   const { token } = useAuth();

//   // Fallback: check for unread notifications on mount (SSE disabled)
//   useEffect(() => {
//     const checkUnread = async () => {
//       try {
//         const response = await fetch("/api/notifications", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (response.ok) {
//           const text = await response.text();
//           if (text.trim()) {
//             const data = JSON.parse(text);
//             if (data != null) {
//               setHasUnread(data.some((notification: any) => !notification.read));
//             }
//           } else {
//             setHasUnread(false);
//           }
//         }
//       } catch (err) {
//         console.error("Failed to check unread notifications", err);
//       }
//     };

//     checkUnread();
//   }, [token]);

//   if (!hasUnread) return null;

//   return <div className={`h-2 w-2 rounded-full bg-red-500 ${className}`} />;
// }
