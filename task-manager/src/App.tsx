import { useCallback, useMemo, useState } from 'react';
import Board from './components/Board';
import ErrorMessage from './components/ErrorMessage';
import Filter from './components/Filter';
import Loader from './components/Loader';
import Pagination from './components/Pagination';
import TaskForm from './components/TaskForm';
import { useTodos } from './hooks/useTodos';
import type { Todo } from './types/todo';
import './App.css';

function App() {
  const {
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
  } = useTodos();

  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const { todoTasks, doneTasks } = useMemo(
    () => ({
      todoTasks: todos.filter((t) => !t.completed),
      doneTasks: todos.filter((t) => t.completed),
    }),
    [todos],
  );

  const counts = useMemo(
    () => ({ all: todos.length, todo: todoTasks.length, done: doneTasks.length }),
    [todos, todoTasks, doneTasks],
  );

  const handleEdit = useCallback((todo: Todo) => setEditingTodo(todo), []);
  const handleCancelEdit = useCallback(() => setEditingTodo(null), []);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!editingTodo) return addTask(text);

      const ok = await updateTask(editingTodo.id, { todo: text });
      if (ok) setEditingTodo(null);
      return ok;
    },
    [editingTodo, addTask, updateTask],
  );

  const handleDelete = useCallback(
    (todo: Todo) => {
      if (!window.confirm(`Delete task "${todo.todo}"?`)) return;
      setEditingTodo((current) => (current?.id === todo.id ? null : current));
      void deleteTask(todo.id);
    },
    [deleteTask],
  );

  const handleMove = useCallback(
    (todo: Todo, completed: boolean) => {
      void updateTask(todo.id, { completed });
    },
    [updateTask],
  );

  const isSubmitting = editingTodo ? pendingIds.includes(editingTodo.id) : isAdding;
  const isBusy = isAdding || pendingIds.length > 0;

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Task Manager</h1>
          <p className="app__subtitle">Drag tasks between columns to change their status.</p>
        </div>
        {isBusy && <Loader size="small" label="Saving…" />}
      </header>

      <TaskForm
        key={editingTodo?.id ?? 'new'}
        editingTodo={editingTodo}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
      />

      <div className="app__toolbar">
        <Filter value={filter} counts={counts} onChange={setFilter} />
      </div>

      {actionError && <ErrorMessage message={actionError} onClose={clearActionError} />}

      <main className="app__main">
        {isLoading && <Loader label="Loading tasks…" />}
        {error && <ErrorMessage message={`Could not load tasks: ${error}`} onRetry={retry} />}
        {!isLoading && !error && (
          <Board
            todoTasks={todoTasks}
            doneTasks={doneTasks}
            filter={filter}
            pendingIds={pendingIds}
            editingId={editingTodo?.id ?? null}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMove={handleMove}
          />
        )}
      </main>

      <Pagination page={page} totalPages={totalPages} disabled={isLoading} onPageChange={goToPage} />
    </div>
  );
}

export default App;
