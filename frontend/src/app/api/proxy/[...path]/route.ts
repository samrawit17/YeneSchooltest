import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetPath = path.join('/');
  const query = req.nextUrl.search || '';
  const targetUrl = `${BACKEND_URL}/${targetPath}${query}`;

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  const cookie = req.headers.get('cookie');
  if (auth) headers.set('authorization', auth);
  if (contentType) headers.set('content-type', contentType);
  if (cookie) headers.set('cookie', cookie);

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  let upstream: Response;
  try {
    const body = hasBody ? await req.arrayBuffer() : undefined;
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Backend proxy request failed', {
      path: targetPath,
      method,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        message: 'Backend proxy request failed',
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) {
    responseHeaders.set('content-type', upstreamType);
  }
  const upstreamCookie = upstream.headers.get('set-cookie');
  if (upstreamCookie) {
    responseHeaders.set('set-cookie', upstreamCookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
