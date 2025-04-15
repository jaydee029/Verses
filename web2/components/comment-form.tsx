"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-hooks"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function CommentForm({ proseId }: { proseId: string }) {
  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { token } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!body.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/${proseId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      })

      if (!response.ok) {
        throw new Error("Failed to post comment")
      }

      setBody("")
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Share your thoughts on this verse..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[80px] bg-white dark:bg-slate-900"
      />
      <Button type="submit" disabled={!body.trim() || isSubmitting} className="ml-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Posting...
          </>
        ) : (
          "Post Comment"
        )}
      </Button>
    </form>
  )
}

