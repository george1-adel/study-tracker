import { describe, it, expect } from 'vitest';
import { focusMsByCategory } from './categories';
import { makeTask, makeSession } from './fixtures';

describe('categories', () => {
  describe('empty input', () => {
    it('returns [] on empty tasks and sessions', () => {
      expect(focusMsByCategory([], [])).toEqual([]);
    });
  });

  describe('category aggregation', () => {
    it('groups focusMs by categoryId including null for uncategorised tasks', () => {
      const tMath = makeTask({ id: 't-math', categoryId: 'math' });
      const tUncat = makeTask({ id: 't-uncat', categoryId: null });

      const s1 = makeSession({ id: 's1', taskId: 't-math', durationMs: 3_600_000 });
      const s2 = makeSession({ id: 's2', taskId: 't-math', durationMs: 1_800_000 });
      const s3 = makeSession({ id: 's3', taskId: 't-uncat', durationMs: 2_400_000 });
      const sBreak = makeSession({
        id: 's4',
        taskId: 't-math',
        kind: 'pomodoro_short_break',
        durationMs: 300_000,
      });

      const results = focusMsByCategory([tMath, tUncat], [s1, s2, s3, sBreak]);

      expect(results).toHaveLength(2);
      expect(results).toContainEqual({ categoryId: 'math', focusMs: 5_400_000 });
      expect(results).toContainEqual({ categoryId: null, focusMs: 2_400_000 });
    });

    it('assigns null categoryId when session taskId is not in tasks array', () => {
      const s1 = makeSession({ id: 's1', taskId: 'unknown-task', durationMs: 1_000_000 });
      const results = focusMsByCategory([], [s1]);
      expect(results).toEqual([{ categoryId: null, focusMs: 1_000_000 }]);
    });
  });
});
