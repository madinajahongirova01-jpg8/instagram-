import { memo, type KeyboardEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Todo } from '../types/todo';
import Loader from './Loader';

export interface TaskCardProps {
  todo: Todo;
  isPending: boolean;
  isEditing: boolean;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onMove: (todo: Todo, completed: boolean) => void;
}

const stopKeyDown = (event: KeyboardEvent) => event.stopPropagation();

function TaskCard({ todo, isPending, isEditing, onEdit, onDelete, onMove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: isPending,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const className = [
    'task-card',
    todo.completed && 'task-card--done',
    isDragging && 'task-card--dragging',
    isEditing && 'task-card--editing',
    isPending && 'task-card--pending',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      <input
        type="checkbox"
        className="task-card__check"
        checked={todo.completed}
        disabled={isPending}
        aria-label={todo.completed ? 'Mark as to do' : 'Mark as done'}
        onChange={() => onMove(todo, !todo.completed)}
        onKeyDown={stopKeyDown}
      />
      <p className="task-card__text">{todo.todo}</p>
      <div className="task-card__actions" onKeyDown={stopKeyDown}>
        {isPending && <Loader size="small" />}
        <button type="button" className="btn btn--ghost btn--small" disabled={isPending} onClick={() => onEdit(todo)}>
          Edit
        </button>
        <button type="button" className="btn btn--danger btn--small" disabled={isPending} onClick={() => onDelete(todo)}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default memo(TaskCard);
