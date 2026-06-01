import { redirect } from "next/navigation";

const SchoolLoginAliasPage = ({ params }: { params: { code: string } }) => {
  redirect(`/schools/${encodeURIComponent(params.code)}/login`);
};

export default SchoolLoginAliasPage;
