import { TaskComposer } from './TaskComposer';
import { TaskList } from './TaskList';
import { TimerPanel } from '../timer';
import './tasks.css';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="tape-container-slot" data-testid="tape-container-slot">
        <TimerPanel />
      </div>
      <TaskComposer />
      <TaskList />
    </div>
  );
}
