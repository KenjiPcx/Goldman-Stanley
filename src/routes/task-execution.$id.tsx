import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TaskExecutionView from '@/components/office/TaskExecutionView';
import { Id } from '@/convex/_generated/dataModel';
import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route';

export const Route = createFileRoute('/task-execution/$id')({
  beforeLoad: protectedRouteBeforeLoad,
  component: TaskExecutionPage,
});

/**
 * Page route wrapper for TaskExecutionView
 * Uses TanStack Router params to get the task execution ID
 */
function TaskExecutionPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const taskId = id as Id<'taskExecutions'>;

  // Custom header with back button for page route
  const header = (
    <div className="flex items-center gap-4 mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.history.back()}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">Task Execution Details</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <TaskExecutionView
          taskExecutionId={taskId}
          header={header}
          fullPage={true}
        />
      </div>
    </div>
  );
}
