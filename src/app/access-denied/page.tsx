"use client";

import { useSearchParams } from 'next/navigation';
import AccessDeniedComponent from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default function AccessDeniedPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as '403' | '404') || '403';
  
  return <AccessDeniedComponent type={type} />;
}