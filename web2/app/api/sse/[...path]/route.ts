// app/api/sse/[...path]/route.ts
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/sse/", ""); // e.g., "timeline" or "comments/123"
  const token =
    url.searchParams.get("token") ||
    request.headers.get("Authorization")?.split(" ")[1];

  try {
    const backendResponse = await fetch(
      `${process.env.API_URL}/api/${path}?${url.searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "text/event-stream",
        },
      }
    );

    // Proxy the backend SSE stream directly to the client
    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Optional headers for CORS (if needed):
        // "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("SSE proxy error:", error);
    return new Response("Failed to connect to SSE", { status: 502 });
  }
}
