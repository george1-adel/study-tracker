import type { Task, Session } from '../types';
import { isFocusKind } from '../types';

export interface CategoryFocusMs {
  categoryId: string | null;
  focusMs: number;
}

export function focusMsByCategory(tasks: Task[], sessions: Session[]): CategoryFocusMs[] {
  const taskCategoryMap = new Map<string, string | null>();
  for (const t of tasks) {
    taskCategoryMap.set(t.id, t.categoryId);
  }

  const categoryTotals = new Map<string | null, number>();
  let hasFocusSessions = false;

  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      hasFocusSessions = true;
      const categoryId = taskCategoryMap.get(s.taskId) ?? null;
      const current = categoryTotals.get(categoryId) ?? 0;
      categoryTotals.set(categoryId, current + s.durationMs);
    }
  }

  if (!hasFocusSessions) {
    return [];
  }

  const result: CategoryFocusMs[] = [];
  for (const [categoryId, focusMs] of categoryTotals.entries()) {
    result.push({ categoryId, focusMs });
  }

  return result;
}
