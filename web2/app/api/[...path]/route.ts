import { type NextRequest, NextResponse } from "next/server"

// This is a proxy API route that forwards requests to the backend
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", ""); 
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("Authorization")?.split(" ")[1];

  // Check if this is an SSE endpoint
  // const isSSE = path === "timeline"  || path === "notifications" ||path.includes("/comments");

  // if (isSSE) {
  //   try {
  //     // Try SSE first
  //     const response = await fetch(`${process.env.API_URL}/api/${path}`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         Accept: "text/event-stream",
  //       },
  //     });
  //     console.log(response)

  //     const text = await response.text(); 

  //     if (response.ok && !text.trim()) {
  //       try {
  //         const data = JSON.parse(text); 

  //         // Set up SSE response
  //         const encoder = new TextEncoder();
  //         const stream = new ReadableStream({
  //           async start(controller) {
  //             controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  //             // Keep the connection open
  //             const interval = setInterval(() => {
  //               controller.enqueue(encoder.encode(": keepalive\n\n"));
  //             }, 30000);

  //             // Clean up on close
  //             request.signal.addEventListener("abort", () => {
  //               clearInterval(interval);
  //               controller.close();
  //             });
  //           },
  //         });

  //         return new NextResponse(stream, {
  //           headers: {
  //             "Content-Type": "text/event-stream",
  //             "Cache-Control": "no-cache",
  //             Connection: "keep-alive",
  //           },
  //         });
  //       } catch (jsonError) {
  //         console.error("SSE JSON parse error:", jsonError);
  //         return NextResponse.json({ error: "Invalid JSON response from SSE" }, { status: 502 });
  //       }
  //     } else {
  //       console.log("SSE response empty, falling back to basic fetch...");

  //       const fallbackResponse = await fetch(`${process.env.API_URL}/api/${path}`, {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });

  //       const fallbackText = await fallbackResponse.text(); 

  //       if (!fallbackText.trim()) {
  //         return NextResponse.json({ error: "Empty response from server" }, { status: 502 });
  //       }

        // try {
        //   return NextResponse.json(JSON.parse(fallbackText), { status: fallbackResponse.status });
        // } catch {
        //   return NextResponse.json({ error: "Invalid JSON from fallback" }, { status: 502 });
  //       }
  //     }
  //   } catch (error: any) {
  //     console.error("SSE error:", error);
  //     if (error.code !== "UND_ERR_HEADERS_TIMEOUT") {
  //       return NextResponse.json({ error: "Failed to connect to SSE" }, { status: 500 });
  //     }
  //   }
  // }

  // Regular API request
  try {
    const response = await fetch(`${process.env.API_URL}/api/${path}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": request.headers.get("Content-Type") || "application/json",
      },
    });

    const responseText = await response.text(); // Read response as text
    // console.log("problematic text")
    // console.log(responseText)
    if (responseText.trim() !== "") {
      // return NextResponse.json({ error: "Empty response from API" }, { status: 502 });
      return NextResponse.json(JSON.parse(responseText), { status: response.status });
    }

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {

  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", ""); // Remove "/api/" prefix

  // if (!path) {
  //   return new Response("Invalid request", { status: 400 });
  // }
  //const path = params.path.join("/")

  const token = request.headers.get("Authorization")?.split(" ")[1]
  let body = {}
  try {
    body = request.body ? await request.json() : {};
  } catch (error) {
    console.error("Invalid JSON:", error);
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
  }


  try {
    const response = await fetch(`${process.env.API_URL}/api/${path}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to post data" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", ""); 
  // const path = params.path.join("/")
  const token = request.headers.get("Authorization")?.split(" ")[1]

  try {
    const response = await fetch(`${process.env.API_URL}/api/${path}`, {
      method: "DELETE",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  // const path = params.path.join("/")
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", ""); 
  const token = request.headers.get("Authorization")?.split(" ")[1]
  const body = await request.json()

  try {
    const response = await fetch(`${process.env.API_URL}/api/${path}`, {
      method: "PUT",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to update data" }, { status: 500 })
  }
}

