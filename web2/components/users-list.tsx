"use client"
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type User = {
    username: string;
    name: string;
    follower: boolean;
    followers: number;
    id: string;
};

export function UsersList() {
    const { token, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFollowToggle = async (username: string) => {
        try {
            const response = await fetch(`/api/users/${username}/toggle_follow`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error("Failed to toggle follow");
            }

            const updatedUser = await response.json();
            setUsers((prevUsers) => prevUsers.map((user) => (user.username === username ? updatedUser : user)));
        } catch (err) {
            toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
        }
    };

    const filteredUsers = users.filter((u) => u.id !== currentUser?.id);

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
        );
    }

    // console.log(filteredUsers)
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold">Find Users to Follow</h2>
            {filteredUsers.length === 0 ? (
                <div className="rounded-lg border bg-white dark:bg-slate-900 p-6 text-center">
                    <p className="text-muted-foreground">No Users!</p>
                </div>
            ) : (
                filteredUsers.map((user) => (
                    <Card key={user.id} className="bg-white dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Link href={`/profile/${user.username}`}>
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div className="flex-1">
                                <Link href={`/profile/${user.username}`} className="font-semibold hover:underline">
                                    @{user.username}
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{user.followers} Followers</p>
                            <Button size="sm" onClick={() => handleFollowToggle(user.username)}>
                                {user.follower ? "Following" : "Follow"}
                            </Button>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}