import { AnalysisForm } from '@/components/dashboard/analysis-form';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/analysis/$measurement')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnalysisForm />;
}
