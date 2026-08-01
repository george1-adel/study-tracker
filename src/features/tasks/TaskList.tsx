import { useMemo } from 'react';
import { useTasks } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { EmptyState } from '../../components/EmptyState';
import { TaskRow } from './TaskRow';

export function TaskList() {
  const t = useT();
  const rawTasks = useTasks();

  const activeTasks = useMemo(
    () => rawTasks.filter((t) => t.deletedAt === null),
    [rawTasks]
  );

  const pendingTasks = useMemo(
    () => activeTasks.filter((t) => t.completedAt === null && t.completedDayKey === null),
    [activeTasks]
  );

  const completedTasks = useMemo(
    () => activeTasks.filter((t) => t.completedAt !== null || t.completedDayKey !== null),
    [activeTasks]
  );

  if (activeTasks.length === 0) {
    return <EmptyState title={t('tasks.empty')} />;
  }

  return (
    <div className="task-list">
      {pendingTasks.length > 0 && (
        <section className="task-group">
          <h2 className="task-group-heading">
            {t('tasks.pendingCount', { count: pendingTasks.length })}
          </h2>
          <div className="task-group-items">
            {pendingTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {completedTasks.length > 0 && (
        <section className="task-group">
          <h2 className="task-group-heading">
            {t('tasks.completedCount', { count: completedTasks.length })}
          </h2>
          <div className="task-group-items">
            {completedTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
