"use client"

import type React from "react"

import { createContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  username: string
  name: string
  email?: string
  is_red?: boolean
}

type AuthContextType = {
  user: User | null
  token: string | null
  login: (usernameOrEmail: string, password: string) => Promise<void>
  signup: (name: string, username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check for token in cookies
    const checkAuth = async () => {
      const storedToken = getCookie("auth_token")

      if (storedToken) {
        try {
          // Validate token and get user info
          const response = await fetch("/api/users", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          })

          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
            setToken(storedToken)
          } else {
            // Token is invalid, try to refresh
            await refreshToken()
          }
        } catch (err) {
          console.error("Auth check failed", err)
          clearAuth()
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [user])

  const refreshToken = async () => {
    try {
      const refreshToken = getCookie("refresh_token")

      if (!refreshToken) {
        throw new Error("No refresh token")
      }

      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.token)
        setUser(data.user)

        // Set cookies
        setCookie("auth_token", data.token, 1) // 1 day
        setCookie("refresh_token", data.refresh_token, 7) // 7 days

        return true
      } else {
        throw new Error("Token refresh failed")
      }
    } catch (err) {
      clearAuth()
      return false
    }
  }

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameOrEmail.includes("@") ? "" : usernameOrEmail,
          email: usernameOrEmail.includes("@") ? usernameOrEmail : "",
          password,
        }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const data = await response.json()
      // Get user info
      const userResponse = await fetch(`/api/users/${data.username}`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error("Failed to get user info")
      }

      const userData = await userResponse.json()

      setUser(userData)
      setToken(data.token)

      // Set cookies
      setCookie("auth_token", data.token, 1) // 1 day
      setCookie("refresh_token", data.refresh_token, 7) // 7 days
    } catch (err) {
      console.error("Login failed", err)
      throw err
    }
  }

  const signup = async (name: string, username: string, email: string, password: string) => {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, username, email, password }),
      })

      if (!response.ok) {
        throw new Error("Signup failed")
      }

      const data = await response.json()
      return data
    } catch (err) {
      console.error("Signup failed", err)
      throw err
    }
  }

  const logout = async () => {
    try {
      // Revoke token on server
      if (token) {
        await fetch("/api/revoke", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
      }
    } catch (err) {
      console.error("Logout error", err)
    } finally {
      clearAuth()
      router.push("/login")
    }
  }

  const clearAuth = () => {
    setUser(null)
    setToken(null)
    deleteCookie("auth_token")
    deleteCookie("refresh_token")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
  )
}

// Cookie helper functions
function setCookie(name: string, value: string, days: number) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

// function getCookie(name: string) {
//   const nameEQ = name + "="
//   const ca = document.cookie.split(";")
//   for (let i = 0; i < ca.length; i++) {
//     let c = ca[i]
//     while (c.charAt(0) === " ") c = c.substring(1, c.length)
//     if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
//   }
//   return null
// }

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim(); 
    if (trimmedCookie.startsWith(nameEQ)) {
      return trimmedCookie.substring(nameEQ.length);
    }
  }

  return null;
}


function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

