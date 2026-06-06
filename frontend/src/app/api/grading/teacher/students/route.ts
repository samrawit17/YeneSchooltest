import { NextResponse } from 'next/server';
import {
  API_URL,
  getCookieAuthHeaders,
  readBackendJson,
  unauthorizedResponse,
} from '../../proxy-utils';

export async function GET(request: Request) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const params = searchParams.toString();

    const response = await fetch(`${API_URL}/grading/teacher/students?${params}`, {
      method: 'GET',
      headers: authHeaders,
    });

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
