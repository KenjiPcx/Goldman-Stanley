import { createFileRoute } from '@tanstack/react-router';
import ReviewsPage from '@/app/reviews/page';
import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route';

export const Route = createFileRoute('/reviews')({
  beforeLoad: protectedRouteBeforeLoad,
  component: ReviewsPage
});
