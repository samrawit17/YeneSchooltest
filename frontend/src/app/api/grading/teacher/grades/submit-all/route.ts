import { NextResponse } from 'next/server';
import {
  API_URL,
  getCookieAuthHeaders,
  readBackendJson,
  unauthorizedResponse,
} from '../../../proxy-utils';

export async function POST(request: Request) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const params = searchParams.toString();

    const response = await fetch(`${API_URL}/grading/teacher/grades/submit-all?${params}`, {
      method: 'POST',
      headers: authHeaders,
    });

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error submitting grades:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
