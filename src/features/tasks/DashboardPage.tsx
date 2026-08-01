import { TaskComposer } from './TaskComposer';
import { TaskList } from './TaskList';
import { TimerPanel } from '../timer';
import { TodayTape } from '../tape';
import './tasks.css';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="tape-container-slot" data-testid="tape-container-slot">
        <TodayTape />
        <TimerPanel />
      </div>
      <TaskComposer />
      <TaskList />
    </div>
  );
}
