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
      return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
    }

    const response = await fetch(`${API_URL}/grading/admin/assessment-types`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
    }

    const data = await readBackendJson(response);
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
  }
}

const DEFAULT_ASSESSMENT_TYPES = [
  { code: 'QUIZ', name: 'Quiz', percentage: 15 },
  { code: 'TEST', name: 'Test', percentage: 25 },
  { code: 'MID', name: 'Mid Exam', percentage: 20 },
  { code: 'FINAL', name: 'Final Exam', percentage: 30 },
  { code: 'ATTENDANCE', name: 'Attendance', percentage: 10 },
];

export async function POST(request: Request) {
  try {
    const authHeaders = getCookieAuthHeaders(request);
    
    if (!authHeaders) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/grading/admin/assessment-types`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    const data = await readBackendJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving assessment types:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
