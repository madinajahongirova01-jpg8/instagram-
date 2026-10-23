import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addTodo, deleteTodo, getTodos, updateTodo } from '../api/todos';
import type { Filter, Todo, TodoChanges } from '../types/todo';

export const PAGE_SIZE = 10;
const DEFAULT_USER_ID = 1;

type PagesCache = Record<number, Todo[]>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function mapPages(pages: PagesCache, update: (list: Todo[]) => Todo[]): PagesCache {
  const result: PagesCache = {};
  for (const [page, list] of Object.entries(pages)) {
    result[Number(page)] = update(list);
  }
  return result;
}

export function useTodos() {
  const [pages, setPages] = useState<PagesCache>({});
  const [createdTodos, setCreatedTodos] = useState<Todo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');

  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);

  const localIds = useRef(new Set<number>());
  const nextLocalId = useRef(-1);

  const isPageLoaded = page in pages;
  const isLoading = !isPageLoaded && error === null;

  useEffect(() => {
    if (isPageLoaded) return;

    const controller = new AbortController();
    getTodos(PAGE_SIZE, (page - 1) * PAGE_SIZE, controller.signal)
      .then((data) => {
        setPages((prev) => ({ ...prev, [page]: data.todos }));
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err));
      });

    return () => controller.abort();
  }, [page, isPageLoaded, reloadKey]);

  const retry = useCallback(() => {
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setError(null);
    setPage(nextPage);
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  const runForTodo = useCallback(async (id: number, task: () => Promise<void>): Promise<boolean> => {
    setActionError(null);
    setPendingIds((prev) => [...prev, id]);
    try {
      await task();
      return true;
    } catch (err) {
      setActionError(getErrorMessage(err));
      return false;
    } finally {
      setPendingIds((prev) => prev.filter((pendingId) => pendingId !== id));
    }
  }, []);

  const addTask = useCallback(async (text: string): Promise<boolean> => {
    setActionError(null);
    setIsAdding(true);
    try {
      const created = await addTodo({ todo: text, completed: false, userId: DEFAULT_USER_ID });
      const id = nextLocalId.current--;
      localIds.current.add(id);
      setCreatedTodos((prev) => [{ ...created, id }, ...prev]);
      setError(null);
      setPage(1);
      return true;
    } catch (err) {
      setActionError(getErrorMessage(err));
      return false;
    } finally {
      setIsAdding(false);
    }
  }, []);

  const updateTask = useCallback(
    (id: number, changes: TodoChanges) =>
      runForTodo(id, async () => {
        if (!localIds.current.has(id)) await updateTodo(id, changes);

        const update = (list: Todo[]) => list.map((t) => (t.id === id ? { ...t, ...changes } : t));
        setCreatedTodos(update);
        setPages((prev) => mapPages(prev, update));
      }),
    [runForTodo],
  );

  const deleteTask = useCallback(
    (id: number) =>
      runForTodo(id, async () => {
        if (localIds.current.has(id)) {
          localIds.current.delete(id);
        } else {
          await deleteTodo(id);
        }

        const remove = (list: Todo[]) => list.filter((t) => t.id !== id);
        setCreatedTodos(remove);
        setPages((prev) => mapPages(prev, remove));
      }),
    [runForTodo],
  );

  const todos = useMemo(() => {
    const serverTodos = pages[page] ?? [];
    return page === 1 ? [...createdTodos, ...serverTodos] : serverTodos;
  }, [pages, page, createdTodos]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    todos,
    page,
    totalPages,
    goToPage,
    filter,
    setFilter,
    isLoading,
    error,
    retry,
    actionError,
    clearActionError,
    isAdding,
    pendingIds,
    addTask,
    updateTask,
    deleteTask,
  };
}
