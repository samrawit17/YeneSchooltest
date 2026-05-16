import { redirect } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default function TeacherDetailRedirectPage({ params }: PageProps) {
  redirect(`/list/staff/${params.id}`);
}
