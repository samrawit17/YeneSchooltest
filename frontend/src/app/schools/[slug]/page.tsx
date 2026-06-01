import { redirect } from "next/navigation";

const SchoolHomePage = ({ params }: { params: { slug: string } }) => {
  redirect(`/schools/${encodeURIComponent(params.slug)}/login`);
};

export default SchoolHomePage;
