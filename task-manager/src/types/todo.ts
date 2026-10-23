export interface Todo {
  id: number;
  todo: string;
  completed: boolean;
  userId: number;
}

export interface TodosResponse {
  todos: Todo[];
  total: number;
  skip: number;
  limit: number;
}

export type NewTodo = Omit<Todo, 'id'>;

export type TodoChanges = Partial<Pick<Todo, 'todo' | 'completed'>>;

export interface DeletedTodo extends Todo {
  isDeleted: boolean;
  deletedOn: string;
}

export type ColumnId = 'todo' | 'done';

export type Filter = 'all' | ColumnId;
