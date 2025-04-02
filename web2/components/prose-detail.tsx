"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-hooks"
import { ProseCard } from "@/components/prose-card"
import { CommentsList } from "@/components/comments-list"
import { CommentForm } from "@/components/comment-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type ProseDetailProps = {
  prose: {
    id: string
    body: string
    created_at: string
    updated_at: string
    username: string
    mine: boolean
    liked: boolean
    likes_count: number
    comments: number
  }
}

export function ProseDetail({ prose: initialProse }: ProseDetailProps) {
  const [prose, setProse] = useState(initialProse)
  const { token } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLikeToggle = async () => {
    try {
      const response = await fetch(`/api/prose/${prose.id}/togglelike`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify("")
      })

      if (!response.ok) {
        throw new Error("Failed to toggle like")
      }

      const result = await response.json()

      setProse({
        ...prose,
        liked: result.liked,
        likes_count: result.likes_count,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to like/unlike verse",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
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

      toast({
        title: "Verse deleted",
        description: "Your verse has been deleted successfully",
      })

      router.push("/")
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete verse",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-2 text-xl font-serif font-bold">Verse</h1>
      </div>

      <ProseCard prose={prose} onLikeToggle={handleLikeToggle} onDelete={prose.mine ? handleDelete : undefined} />

      <div className="space-y-4">
        <h2 className="text-xl font-serif font-semibold">Comments</h2>
        <CommentForm proseId={prose.id} />
        <CommentsList proseId={prose.id} />
      </div>
    </div>
  )
}

