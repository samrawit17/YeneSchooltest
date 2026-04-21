import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
    }

    const response = await fetch(`${API_URL}/grading/admin/assessment-types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(DEFAULT_ASSESSMENT_TYPES, { status: 200 });
    }

    const data = await response.json();
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/grading/admin/assessment-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving assessment types:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}