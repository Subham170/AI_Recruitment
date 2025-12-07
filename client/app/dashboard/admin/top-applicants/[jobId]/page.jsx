import TopApplicantsPageContent from "@/components/dashboard/TopApplicantsPageContent";

export default async function TopApplicantsJobPage({ params }) {
  const { jobId } = await params;
  return <TopApplicantsPageContent jobId={jobId} />;
}
