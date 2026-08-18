import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('furtail_access_token')?.value;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const upstreamUrl = `${process.env.NEXT_PUBLIC_FURTAIL_API_URL}/realtime/stream`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      console.error("[Realtime Proxy] Upstream returned status:", upstreamResponse.status);
      return new Response(upstreamResponse.statusText, { status: upstreamResponse.status });
    }

    // Return the readable stream directly to the client
    return new Response(upstreamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("[Realtime Proxy] Fetch error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
