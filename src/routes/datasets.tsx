import { createFileRoute } from '@tanstack/react-router';
import DatasetsPage from '@/app/datasets/page';
import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route';

export const Route = createFileRoute('/datasets')({
  beforeLoad: protectedRouteBeforeLoad,
  component: DatasetsPage
});
