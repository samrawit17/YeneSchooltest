import { redirect } from "next/navigation";

const SchoolLoginPage = ({ params }: { params: { slug: string } }) => {
  redirect(`/sign-in?slug=${encodeURIComponent(params.slug)}`);
};

export default SchoolLoginPage;
