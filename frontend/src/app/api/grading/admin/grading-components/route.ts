import { NextResponse } from 'next/server';
import {
  API_URL,
  getCookieAuthHeaders,
  readBackendJson,
} from '../../proxy-utils';

export async function GET(request: Request) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return NextResponse.json([], { status: 200 });
    }

    const response = await fetch(`${API_URL}/grading/admin/grading-components`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
