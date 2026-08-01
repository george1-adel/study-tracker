import { TaskComposer } from './TaskComposer';
import { TaskList } from './TaskList';
import './tasks.css';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="tape-container-slot" data-testid="tape-container-slot" />
      <TaskComposer />
      <TaskList />
    </div>
  );
}
