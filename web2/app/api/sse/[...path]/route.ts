// // app/api/sse/[...path]/route.ts
// import { type NextRequest } from "next/server";

// export async function GET(request: NextRequest) {
//   const url = new URL(request.url);
//   const path = url.pathname.replace("/api/sse/", ""); // e.g., "timeline" or "comments/123"
//   const token =
//     url.searchParams.get("token") ||
//     request.headers.get("Authorization")?.split(" ")[1];

//   try {
//     const backendResponse = await fetch(
//       `${process.env.API_URL}/api/${path}?${url.searchParams.toString()}`,
//       {
//         method: "GET",
//         headers: {
//           Authorization: token ? `Bearer ${token}` : "",
//           Accept: "text/event-stream",
//         },
//       }
//     );

//     // Proxy the backend SSE stream directly to the client
//     console.log(backendResponse.body)
//     // let passedValue = await new Response(backendResponse.body).text();
//     // if (passedValue){
//     // let valueToJson = JSON.parse(passedValue);
//     // console.log("jsonval:", valueToJson)
//     // }
//     return new Response(backendResponse.body, {
//       status: 200,
//       headers: {
//         "Content-Type": "text/event-stream",
//         "Cache-Control": "no-cache",
//         Connection: "keep-alive",
//         // Optional headers for CORS (if needed):
//         // "Access-Control-Allow-Origin": "*",
//       },
//     });
//   } catch (error) {
//     console.log("SSE proxy error:", error);
//     return new Response("Failed to connect to SSE", { status: 502 });
//   }
// }






// app/api/sse/[...path]/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/sse/", ""); // e.g., "timeline" or "comments/123"
  const token =
    url.searchParams.get("token") ||
    request.headers.get("Authorization")?.split(" ")[1];

  // --- Ensure token exists (optional but good practice) ---
  if (!token) {
    return new Response("Authentication token required", { status: 401 });
  }
  // --- ---

  try {
    const backendUrl =  `${process.env.API_URL}/api/${path}`;
    // Create a new URL object to safely append search params
    const targetUrl = new URL(backendUrl);

    // Forward existing search params EXCEPT the token we added client-side
    url.searchParams.forEach((value, key) => {
        if (key !== 'token') { // Don't forward the token query param if backend expects header
            targetUrl.searchParams.append(key, value);
        }
    });


    console.log(`Proxying SSE request to:${targetUrl.toString()}`);

    const backendResponse = await fetch(
      targetUrl.toString(), // Use the constructed URL with search params
      {
        method: "GET",
        headers: {
          // Pass the token in the Authorization header to the actual backend
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          // Forward other relevant headers if needed
          // 'X-Forwarded-For': request.ip ?? 'unknown',
        },
        // Important for streaming responses in Node fetch / Next.js Edge runtime
        cache: 'no-store', // Ensure fresh data
         // If using Node >= 18, duplex might be needed depending on the exact env
         // duplex: 'half'
      }
    );

    // Check if the backend responded successfully
    if (!backendResponse.ok) {
        console.error(`SSE Backend error (${backendResponse.status}): ${await backendResponse.text()}`);
        return new Response(`Backend request failed with status ${backendResponse.status}`, { status: backendResponse.status });
    }

    // Check if the backend response is actually an event stream
    const contentType = backendResponse.headers.get("Content-Type");
    if (!contentType || !contentType.includes("text/event-stream")) {
        console.error(`Backend did not respond with Content-Type: text/event-stream. Received: ${contentType}`);
        // Return an error, maybe log the response body if small
        // const responseBody = await backendResponse.text();
        // console.error("Backend response body:", responseBody);
        return new Response("Backend did not return an event stream", { status: 502 }); // 502 Bad Gateway
    }


    // --- CORRECT WAY: Stream the backend response directly ---
    // Ensure the body exists and is a ReadableStream
    if (!backendResponse.body) {
         console.error("Backend response body is null.");
        return new Response("Backend response body is null", { status: 502 });
    }

    // Return the backend's stream directly to the client
    console.log("body", backendResponse.body)
    return new Response(backendResponse.body, {
      status: 200, // Or backendResponse.status if you want to mirror it
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
         // Copy other relevant headers from backendResponse if needed
         // e.g., backendResponse.headers.get('X-My-Custom-Header')
      },
    });
    // --- ---

  } catch (error) {
    console.error("SSE proxy fetch error:", error);
     // Check if it's a fetch error (e.g., connection refused)
    if (error instanceof TypeError && error.message === 'fetch failed') {
       return new Response("Failed to connect to the backend SSE service", { status: 502 }); // Bad Gateway might be appropriate
    }
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// Optional: Configure Edge Runtime for potentially better performance with streaming
// export const runtime = 'edge';