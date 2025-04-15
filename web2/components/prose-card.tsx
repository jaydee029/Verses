"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-hooks"
import { useToast } from "@/hooks/use-toast"

type ProseCardProps = {
  prose: {
    id: string
    body: string
    created_at: string
    updated_at?: string
    username: string
    mine: boolean
    liked: boolean
    likes_count: number
    comments: number
  }
  onLikeToggle: () => void
  onDelete?: () => void
}

export function ProseCard({ prose, onLikeToggle, onDelete }: ProseCardProps) {
  const { token } = useAuth()
  const { toast } = useToast()
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/prose/${prose.id}`)

      toast({
        title: "Link copied",
        description: "Verse link copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleDelete = async () => {
    if (!prose.mine || !onDelete) return

    try {
      const response = await fetch(`/api/prose/${prose.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete verse")
      }

      onDelete()

      toast({
        title: "Verse deleted",
        description: "Your verse has been deleted successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete verse",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <Link href={`/profile/${prose.username}`}>
          <Avatar>
            <AvatarImage src={`https://avatar.vercel.sh/${prose.username}`} />
            <AvatarFallback>{prose.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1">
          <Link href={`/profile/${prose.username}`} className="font-semibold hover:underline">
            @{prose.username}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(prose.created_at), { addSuffix: true })}
          </p>
        </div>

        {prose.mine && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent>
        <Link href={`/prose/${prose.id}`}>
          <p className="whitespace-pre-wrap font-serif leading-relaxed">{prose.body}</p>
        </Link>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="flex w-full justify-between">
          <Button variant="ghost" size="sm" className={prose.liked ? "text-red-500" : ""} onClick={onLikeToggle}>
            <Heart className={`mr-1 h-4 w-4 ${prose.liked ? "fill-red-500" : ""}`} />
            {prose.likes_count > 0 && prose.likes_count}
          </Button>

          <Link href={`/prose/${prose.id}`}>
            <Button variant="ghost" size="sm">
              <MessageCircle className="mr-1 h-4 w-4" />
              {prose.comments > 0 && prose.comments}
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={handleShare} disabled={isSharing}>
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

