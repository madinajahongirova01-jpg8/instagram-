import { useState, type FormEvent } from 'react';
import type { Todo } from '../types/todo';
import Loader from './Loader';

interface TaskFormProps {
  editingTodo: Todo | null;
  isSubmitting: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel: () => void;
}

function TaskForm({ editingTodo, isSubmitting, onSubmit, onCancel }: TaskFormProps) {
  const [text, setText] = useState(editingTodo?.todo ?? '');
  const isEditing = editingTodo !== null;
  const trimmed = text.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || isSubmitting) return;

    const ok = await onSubmit(trimmed);
    if (ok && !isEditing) setText('');
  };

  return (
    <form className={`task-form${isEditing ? ' task-form--editing' : ''}`} onSubmit={handleSubmit}>
      <label className="task-form__label" htmlFor="task-input">
        {isEditing ? 'Edit task' : 'New task'}
      </label>
      <div className="task-form__row">
        <input
          id="task-input"
          className="task-form__input"
          type="text"
          placeholder="What needs to be done?"
          value={text}
          maxLength={200}
          autoFocus={isEditing}
          disabled={isSubmitting}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={!trimmed || isSubmitting}>
          {isSubmitting ? <Loader size="small" label="Saving…" /> : isEditing ? 'Save' : 'Add task'}
        </button>
        {isEditing && (
          <button type="button" className="btn btn--ghost" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default TaskForm;
