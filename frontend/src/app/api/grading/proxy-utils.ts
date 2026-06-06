import { NextResponse } from 'next/server';

export const API_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export function getCookieAuthHeaders(request: Request) {
  const cookie = request.headers.get('cookie');

  if (!cookie) {
    return null;
  }

  return {
    Cookie: cookie,
    'Content-Type': 'application/json',
  };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 },
  );
}

export async function readBackendJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
