"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-hooks"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

type ComposeProseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComposeProseDialog({ open, onOpenChange }: ComposeProseDialogProps) {
  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { token } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!body.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/prose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      })

      if (!response.ok) {
        throw new Error("Failed to post verse")
      }

      setBody("")
      onOpenChange(false)

      toast({
        title: "Verse posted",
        description: "Your verse has been shared with the world",
      })

      // Refresh the page to show the new verse
      router.refresh()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to post verse",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Write a Verse</DialogTitle>
            <DialogDescription>Share your poetry or prose with the world</DialogDescription>
          </DialogHeader>

          <div className="my-6">
            <Textarea
              placeholder="Express yourself through words..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] font-serif text-base"
            />
            <div className="mt-2 text-right text-sm text-muted-foreground">{body.length}/500 characters</div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!body.trim() || body.length > 500 || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Share Verse"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

