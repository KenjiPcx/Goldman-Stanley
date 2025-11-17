import { createFileRoute } from '@tanstack/react-router';
import ResearchChatPage from '@/app/research-chat/page';
import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route';

export const Route = createFileRoute('/research-chat')({
  beforeLoad: protectedRouteBeforeLoad,
  component: ResearchChatPage
});
