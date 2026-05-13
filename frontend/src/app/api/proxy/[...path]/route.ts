import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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
  if (auth) headers.set('authorization', auth);
  if (contentType) headers.set('content-type', contentType);

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  });

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) {
    responseHeaders.set('content-type', upstreamType);
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
