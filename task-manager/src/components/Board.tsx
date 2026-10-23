import { useCallback } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Filter, Todo } from '../types/todo';
import Column from './Column';
import type { TaskCardProps } from './TaskCard';

interface BoardProps extends Pick<TaskCardProps, 'onEdit' | 'onDelete' | 'onMove'> {
  todoTasks: Todo[];
  doneTasks: Todo[];
  filter: Filter;
  pendingIds: number[];
  editingId: number | null;
}

function Board({ todoTasks, doneTasks, filter, pendingIds, editingId, onEdit, onDelete, onMove }: BoardProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return;

      const todo = [...todoTasks, ...doneTasks].find((t) => t.id === active.id);
      const completed = over.id === 'done';
      if (todo && todo.completed !== completed) onMove(todo, completed);
    },
    [todoTasks, doneTasks, onMove],
  );

  const columnProps = { pendingIds, editingId, onEdit, onDelete, onMove };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={`board${filter === 'all' ? '' : ' board--single'}`}>
        {filter !== 'done' && <Column id="todo" title="To Do" todos={todoTasks} {...columnProps} />}
        {filter !== 'todo' && <Column id="done" title="Done" todos={doneTasks} {...columnProps} />}
      </div>
    </DndContext>
  );
}

export default Board;
