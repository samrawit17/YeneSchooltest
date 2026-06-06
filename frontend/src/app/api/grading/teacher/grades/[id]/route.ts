import { NextResponse } from 'next/server';
import {
  API_URL,
  getCookieAuthHeaders,
  readBackendJson,
  unauthorizedResponse,
} from '../../../proxy-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${API_URL}/grading/teacher/grades/${id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
