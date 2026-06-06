import { NextResponse } from 'next/server';
import {
  API_URL,
  getCookieAuthHeaders,
  readBackendJson,
  unauthorizedResponse,
} from '../../proxy-utils';

export async function POST(request: Request) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/grading/teacher/grades`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating grade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
