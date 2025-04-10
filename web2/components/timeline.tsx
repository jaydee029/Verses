"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { ProseCard } from "@/components/prose-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSSE } from "@/lib/use-sse";

type TimelineItem = {
  id: number;
  userid?: string;
  prose: {
    id: string;
    body: string;
    created_at: string;
    updated_at: string;
    username: string;
    mine: boolean;
    liked: boolean;
    likes_count: number;
    comments: number;
  };
};

export function Timeline() {
  const { token } = useAuth();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use SSE to get timeline updates
  const { data, error: sseError } = useSSE<TimelineItem[]>("/api/sse/timeline", token, "timeline",{
    onMessage: (data) => {
      if (data) {
        console.log("SSE CHECK FOR TL")
        console.log(data)
        if (data!=null){
        setTimelineItems(data);
        setIsLoading(false);
        }
      }
      console.log("SSE NO DATA FOR TL")
    },
    fallbackToFetch: true,
  });

  // Fetch timeline if SSE fails
  useEffect(() => {
    if (data) {
      if (data!=null){
        setTimelineItems(data)} else {
          setTimelineItems([])
        }
      setIsLoading(false)
    }

    if (sseError) {
      fetchTimelineItems()
    }
  }, [data, sseError]);

  // Fetch timeline function
  const fetchTimelineItems = async () => {
    console.log("TIMELINE CALL");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/timeline", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh timeline");
      }

      const responseData = await response.json();
      console.log("DATA:", responseData);

      if (responseData!=null){
        setTimelineItems(responseData);
      } else {
        setTimelineItems([])
      }
    } catch (err) {
      setError("Failed to refresh timeline. Please try again.");
      toast({
        title: "Error",
        description: "Failed to refresh timeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle like toggles
  const handleLikeToggle = async (proseId: string) => {
    try {
      const response = await fetch(`/api/prose/${proseId}/togglelike`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      const result = await response.json();

      // Update the liked state in the timeline
      setTimelineItems(
        timelineItems.map((item) => {
          if (item.prose.id === proseId) {
            return {
              ...item,
              prose: {
                ...item.prose,
                liked: result.liked,
                likes_count: result.likes_count,
              },
            };
          }
          return item;
        })
      );
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to like/unlike verse",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">Your Timeline</h2>
        <Button variant="outline" size="sm" onClick={fetchTimelineItems}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-white dark:bg-slate-900 p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
              <div className="flex space-x-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchTimelineItems}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Alert>
      ) : timelineItems.length === 0 ? (
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-muted-foreground">No verses found. Follow writers to see their work here.</p>
        </div>
      ) : (
        timelineItems.map((item) => (
          <ProseCard key={item.prose.id} prose={item.prose} onLikeToggle={() => handleLikeToggle(item.prose.id)} />
        ))
      )}
    </div>
  );
}



