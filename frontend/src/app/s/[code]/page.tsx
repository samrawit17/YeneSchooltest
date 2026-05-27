import { redirect } from "next/navigation";

const SchoolHomeAliasPage = ({ params }: { params: { code: string } }) => {
  redirect(`/schools/${encodeURIComponent(params.code)}/login`);
};

export default SchoolHomeAliasPage;
