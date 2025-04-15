"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-hooks"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useSSE } from "@/lib/use-sse"
import { Heart, MessageCircle, UserPlus, RefreshCw } from "lucide-react"

type Notification = {
  id: string
  userid: string
  proseid?: string
  actors: string[]
  generated_at: string
  read: boolean
  type: string
}

export function NotificationsList() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Try to use SSE for notifications, fall back to regular fetch
  const { data, error: sseError } = useSSE<Notification[]>("/api/sse/notifications", token, "notification", {
    onMessage: (data) => {
      if (data) {
        console.log("SSE CHECK FOR NOTIFS")
        console.log(data)
        if (data!=null){
          setNotifications(data)} else {
            setNotifications([])
          }
        setIsLoading(false)
      }
    },
    fallbackToFetch: true,
  })

  useEffect(() => {
    if (data) {
      if (data!=null){
        setNotifications(data)} else {
          setNotifications([])
        }
      setIsLoading(false)
    }

    if (sseError) {
      fetchNotifications()
    }
  }, [data, sseError])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      if (data!=null){
        setNotifications(data.filter((notification: Notification) => !notification.read));} else {
        setNotifications([])
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark_as_read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify("")
      })

      console.log(response)

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read")
      }

      // Update all notifications as read
      // if (notifications!=null){
      //   setNotifications(
      //     notifications.map((notification) => ({
      //       ...notification,
      //       read: true,
      //     })),
      //   )} else {
          setNotifications([])
        // }
      

      toast({
        title: "Notifications marked as read",
        description: "All notifications have been marked as read",
      })
    } catch (err) {
      console.log(err)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/mark_as_read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify("")
      })
      console.log(response)
      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      // Update the notification as read
      removeNotification(notificationId)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500" />
      case "comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case "follow":
        return <UserPlus className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getNotificationContent = (notification: Notification) => {
    const actorText =
      notification.actors.length > 1
        ? `${notification.actors[0]} and ${notification.actors.length - 1} others`
        : notification.actors[0]

    switch (notification.type) {
      case "like":
        return (
          <>
            <span className="font-semibold">{actorText}</span>
            {" liked your verse"}
          </>
        )
      case "comment":
        return (
          <>
            <span className="font-semibold">{actorText}</span>
            {" commented on your prose"}
          </>
        )
      case "follow":
        return (
          <>
            <span className="font-semibold">{actorText}</span>
            {" started following you"}
          </>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">Notifications</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          { notifications != null? (
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notifications.every((n) => n.read)}>

            Mark all as read
          </Button>) : (null)} 
        </div>
       </div>

      {notifications!= null && notifications.length === 0 ? (
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        notifications.map((notification) => (
          
          <Card
            key={notification.id}
            className={`${!notification.read ? "bg-muted/50" : "bg-white dark:bg-slate-900"}`}
            onClick={() => {
              if (!notification.read) {
                markAsRead(notification.id)
              }
            }}
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getNotificationIcon(notification.type)}
                  <p className="text-sm">{getNotificationContent(notification)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.generated_at), { addSuffix: true })}
                </p>
              </div>

              {notification.proseid && (
                <Link href={`/prose/${notification.proseid}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              )}
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  )
}

