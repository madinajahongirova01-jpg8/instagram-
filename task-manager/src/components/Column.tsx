import { useDroppable } from '@dnd-kit/core';
import type { ColumnId, Todo } from '../types/todo';
import TaskCard, { type TaskCardProps } from './TaskCard';

interface ColumnProps extends Pick<TaskCardProps, 'onEdit' | 'onDelete' | 'onMove'> {
  id: ColumnId;
  title: string;
  todos: Todo[];
  pendingIds: number[];
  editingId: number | null;
}

function Column({ id, title, todos, pendingIds, editingId, onEdit, onDelete, onMove }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section ref={setNodeRef} className={`column column--${id}${isOver ? ' column--over' : ''}`}>
      <header className="column__header">
        <h2 className="column__title">{title}</h2>
        <span className="column__count">{todos.length}</span>
      </header>

      {todos.length === 0 ? (
        <p className="column__empty">No tasks</p>
      ) : (
        <ul className="column__list">
          {todos.map((todo) => (
            <TaskCard
              key={todo.id}
              todo={todo}
              isPending={pendingIds.includes(todo.id)}
              isEditing={todo.id === editingId}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default Column;
