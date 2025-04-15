"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProseCard } from "@/components/prose-card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Prose = {
  id: string;
  body: string;
  username: string;
  created_at: string;
  updated_at: string;
  mine: boolean;
  liked: boolean;
  likes_count: number;
  comments: number;
};

type UserProfileProps = {
  user: {
    name: string;
    username: string;
    id: string;
    follower: boolean;
    follows_back: boolean;
    followers: number;
    following: number;
  };
};

export function UserProfile({ user: initialUser }: UserProfileProps) {
  const [user, setUser] = useState(initialUser);
  const [proses, setProses] = useState<Prose[]>([]);
  // const proses: Array<Prose> = []
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const isCurrentUser = currentUser?.username === user.username;

  useEffect(() => {
    const fetchUserProse = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/${user.username}/prose`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch prose");
        }

        const data = await response.json();
        setProses(data.map((p: Prose) => ({ ...p, username: p.username || user.username })));
      } catch (err) {
        setError("Failed to load prose. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load prose.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProse();
  }, [user.username, token]);

  const handleToggleFollow = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${user.username}/toggle_follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle follow");
      }

      const result = await response.json();

      setUser({
        ...user,
        follower: result.followed,
        followers: result.followers_count,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to follow/unfollow user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async (proseId: string) => {
    if (!proses) return;

    try {
      const response = await fetch(`/api/prose/${proseId}/togglelike`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify("")
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      const result = await response.json();

      setProses(proses.map(prose =>
        prose.id === proseId ? { ...prose, liked: result.liked, likes_count: result.likes_count } : prose
      ));
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to like/unlike verse",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProse = async (proseId: string) => {
    if (!proses) return;

    try {
      const response = await fetch(`/api/prose/${proseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete verse");
      }

      setProses(proses.filter(prose => prose.id !== proseId));

      toast({
        title: "Verse deleted",
        description: "Your verse has been deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete verse",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div>
                <CardTitle className="text-xl font-serif">{user.name}</CardTitle>
                <CardDescription>@{user.username}</CardDescription>
              </div>
            </div>

            {!isCurrentUser && (
              <Button variant={user.follower ? "outline" : "default"} onClick={handleToggleFollow} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : user.follower ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{user.followers}</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div>
              <span className="font-semibold">{user.following}</span>{" "}
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="verses">
        <TabsList className="w-full bg-white dark:bg-slate-900">
          <TabsTrigger value="verses" className="flex-1">Verses</TabsTrigger>
          {/* <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger> */}
        </TabsList>

        <TabsContent value="verses">
          {isLoading ? (
            <p>Loading...</p>
          ) : proses.length ? (
            proses.map(prose => (
              <ProseCard
                key={prose.id}
                prose={prose}
                onLikeToggle={() => handleLikeToggle(prose.id)}
                onDelete={isCurrentUser ? () => handleDeleteProse(prose.id) : undefined}
              />
            ))
          ) : (
            <p>No verses found.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
