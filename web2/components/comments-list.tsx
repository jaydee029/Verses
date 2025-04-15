"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSSE } from "@/lib/use-sse"
import Link from "next/link"

type Comment = {
  id: number
  username: string
  proseid?: string
  created_at: string
  likes_count: number
  liked: boolean
  mine: boolean
  user?: {
    name: string
    username: string
  }
  body: string
}

export function CommentsList({ proseId }: { proseId: string }) {
  const { token } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Try to use SSE for comments, fall back to regular fetch
  const { data, error: sseError } = useSSE<Comment[]>(`/api/sse/${proseId}/comments`, token, "comment", {
    onMessage: (data) => {
      if (data) {
        console.log("SSE CHECK FOR COMMENTS")
        console.log(data)
        setComments(data)
        setIsLoading(false)
      }
    },
    fallbackToFetch: true,
  })

  useEffect(() => {
    if (data) {
      setComments(data)
      setIsLoading(false)
    }

    if (sseError) {
      fetchComments()
    }
  }, [data, sseError])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/${proseId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch comments")
      }

      const data = await response.json()
      console.log(data)
      setComments(data)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLikeToggle = async (commentId: number) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/togglelike`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to toggle like")
      }

      const result = await response.json()

      // Update the comment in the list
      setComments(
        comments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              liked: result.liked,
              likes_count: result.likes_count,
            }
          }
          return comment
        }),
      )
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to like/unlike comment",
        variant: "destructive",
      })
    }
  }
  console.log(comments)
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-6 text-center">
        <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <Link href={`/profile/${comment.username}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${comment.username}`} />
                <AvatarFallback>{comment.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1">
              <Link href={`/profile/${comment.username}`} className="font-semibold hover:underline">
                @{comment.username}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <p className="text-sm">{comment.body}</p>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className={comment.liked ? "text-red-500" : ""}
              onClick={() => handleLikeToggle(comment.id)}
            >
              <Heart className={`mr-1 h-3 w-3 ${comment.liked ? "fill-red-500" : ""}`} />
              {comment.likes_count > 0 && comment.likes_count}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

