import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { t, setLanguage } from '../../i18n';
import { DashboardPage } from './DashboardPage';
import { TaskComposer } from './TaskComposer';
import { TaskList } from './TaskList';

describe('Task Management UI', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.getState().resetAll();
    });
    setLanguage('en');
  });

  it('adding a task appears in the pending group; the input clears', () => {
    render(<DashboardPage />);

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Read book' } });

    const addButton = screen.getByRole('button', { name: 'Add task' });
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    expect(screen.getByText('Read book')).toBeInTheDocument();
    expect(titleInput.value).toBe('');
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
  });

  it('a whitespace-only title cannot be submitted', () => {
    render(<TaskComposer />);

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '   ' } });

    const addButton = screen.getByRole('button', { name: 'Add task' });
    expect(addButton).toBeDisabled();

    expect(useAppStore.getState().tasks.length).toBe(0);
  });

  it('choosing countdown reveals the duration control; switching away hides it', () => {
    render(<TaskComposer />);

    expect(screen.queryByLabelText('Hours')).not.toBeInTheDocument();

    const modeSelect = screen.getByLabelText('Mode');
    fireEvent.change(modeSelect, { target: { value: 'countdown' } });

    expect(screen.getByLabelText('Hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Minutes')).toBeInTheDocument();

    fireEvent.change(modeSelect, { target: { value: 'stopwatch' } });
    expect(screen.queryByLabelText('Hours')).not.toBeInTheDocument();
  });

  it('checking a task moves it from pending to completed and sets both completedAt and completedDayKey; unchecking moves it back and clears both', () => {
    let taskId = '';
    act(() => {
      const task = useAppStore.getState().addTask('Math study', 'stopwatch');
      taskId = task.id;
    });

    render(<TaskList />);

    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.queryByText('Completed (1)')).not.toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    const updatedTask1 = useAppStore.getState().tasks.find((t) => t.id === taskId);
    expect(updatedTask1?.completedAt).not.toBeNull();
    expect(updatedTask1?.completedDayKey).not.toBeNull();

    expect(screen.queryByText('Pending (1)')).not.toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();

    const completedCheckbox = screen.getByRole('checkbox');
    fireEvent.click(completedCheckbox);

    const updatedTask2 = useAppStore.getState().tasks.find((t) => t.id === taskId);
    expect(updatedTask2?.completedAt).toBeNull();
    expect(updatedTask2?.completedDayKey).toBeNull();

    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.queryByText('Completed (1)')).not.toBeInTheDocument();
  });

  it('editing a task title persists via the store', () => {
    let taskId = '';
    act(() => {
      const task = useAppStore.getState().addTask('Old title', 'stopwatch');
      taskId = task.id;
    });
    render(<TaskList />);

    const editBtn = screen.getByRole('button', { name: 'Edit task' });
    fireEvent.click(editBtn);

    const editTitleInput = screen.getByDisplayValue('Old title');
    fireEvent.change(editTitleInput, { target: { value: 'Updated title' } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Updated title')).toBeInTheDocument();
    const storedTask = useAppStore.getState().tasks.find((t) => t.id === taskId);
    expect(storedTask?.title).toBe('Updated title');
  });

  it('changing mode from countdown to stopwatch clears targetMs', () => {
    let taskId = '';
    act(() => {
      const task = useAppStore.getState().addTask('Timed session', 'countdown', 1800000);
      taskId = task.id;
    });
    render(<TaskList />);

    const editBtn = screen.getByRole('button', { name: 'Edit task' });
    fireEvent.click(editBtn);

    const modeSelect = screen.getByLabelText('Mode');
    fireEvent.change(modeSelect, { target: { value: 'stopwatch' } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    const storedTask = useAppStore.getState().tasks.find((t) => t.id === taskId);
    expect(storedTask?.mode).toBe('stopwatch');
    expect(storedTask?.targetMs).toBeNull();
  });

  it('deleting removes the task from the list but leaves its sessions in the store', () => {
    let taskId = '';
    act(() => {
      const task = useAppStore.getState().addTask('To be deleted', 'stopwatch');
      taskId = task.id;

      const mockSession = {
        id: 'session-1',
        taskId: task.id,
        kind: 'stopwatch' as const,
        startedAt: 1000,
        endedAt: 2000,
        durationMs: 1000,
        dayKey: '2026-08-01' as const,
        completed: true,
      };
      useAppStore.setState({ sessions: [mockSession] });
    });

    render(<TaskList />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete task' });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByText('Delete this task? Recorded focus time and session history will be kept.')
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    expect(screen.queryByText('To be deleted')).not.toBeInTheDocument();

    const storedTask = useAppStore.getState().tasks.find((t) => t.id === taskId);
    expect(storedTask?.deletedAt).not.toBeNull();

    const sessions = useAppStore.getState().sessions;
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.id).toBe('session-1');
  });

  it('with zero tasks, EmptyState renders; with only completed tasks, the pending group is absent', () => {
    render(<TaskList />);
    expect(screen.getByText('No tasks yet. Add a task above to get started.')).toBeInTheDocument();

    act(() => {
      const task = useAppStore.getState().addTask('Completed only', 'stopwatch');
      useAppStore.getState().toggleTaskCompleted(task.id, Date.now());
    });

    expect(screen.queryByText(/Pending/)).not.toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();
  });

  it('plural forms render for 0, 1, 2 and 11 tasks in BOTH en and ar', () => {
    expect(t('tasks.pendingCount', { count: 0 }, 'en')).toBe('Pending (0)');
    expect(t('tasks.pendingCount', { count: 1 }, 'en')).toBe('Pending (1)');
    expect(t('tasks.pendingCount', { count: 2 }, 'en')).toBe('Pending (2)');
    expect(t('tasks.pendingCount', { count: 11 }, 'en')).toBe('Pending (11)');

    expect(t('tasks.pendingCount', { count: 0 }, 'ar')).toBe('قيد الانتظار (0)');
    expect(t('tasks.pendingCount', { count: 1 }, 'ar')).toBe('قيد الانتظار (1)');
    expect(t('tasks.pendingCount', { count: 2 }, 'ar')).toBe('قيد الانتظار (2)');
    expect(t('tasks.pendingCount', { count: 11 }, 'ar')).toBe('قيد الانتظار (11)');

    expect(t('tasks.completedCount', { count: 0 }, 'en')).toBe('Completed (0)');
    expect(t('tasks.completedCount', { count: 1 }, 'en')).toBe('Completed (1)');
    expect(t('tasks.completedCount', { count: 2 }, 'en')).toBe('Completed (2)');
    expect(t('tasks.completedCount', { count: 11 }, 'en')).toBe('Completed (11)');

    expect(t('tasks.completedCount', { count: 0 }, 'ar')).toBe('المكتملة (0)');
    expect(t('tasks.completedCount', { count: 1 }, 'ar')).toBe('المكتملة (1)');
    expect(t('tasks.completedCount', { count: 2 }, 'ar')).toBe('المكتملة (2)');
    expect(t('tasks.completedCount', { count: 11 }, 'ar')).toBe('المكتملة (11)');
  });

  it("the Dashboard lists only today's tasks", () => {
    act(() => {
      useAppStore.getState().addTask("Today's Task", 'stopwatch');
      const taskYesterday = useAppStore.getState().addTask("Yesterday's Task", 'stopwatch');
      useAppStore.setState({
        tasks: useAppStore.getState().tasks.map((t) =>
          t.id === taskYesterday.id ? { ...t, dayKey: '2020-01-01' } : t
        ),
      });
    });

    render(<TaskList />);

    expect(screen.getByText("Today's Task")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday's Task")).not.toBeInTheDocument();
  });

  it('a task from a previous day WITH a running timer still appears on the Dashboard', () => {
    let taskYesterdayId = '';
    act(() => {
      const taskYesterday = useAppStore.getState().addTask("Yesterday's Running Task", 'stopwatch');
      taskYesterdayId = taskYesterday.id;
      useAppStore.setState({
        tasks: useAppStore.getState().tasks.map((t) =>
          t.id === taskYesterday.id ? { ...t, dayKey: '2020-01-01' } : t
        ),
      });
      useAppStore.getState().startTimerFor(taskYesterdayId, Date.now());
    });

    render(<TaskList />);

    expect(screen.getByText("Yesterday's Running Task")).toBeInTheDocument();
  });
});
