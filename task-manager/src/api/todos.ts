import type { DeletedTodo, NewTodo, Todo, TodoChanges, TodosResponse } from '../types/todo';

const BASE_URL = 'https://dummyjson.com/todos';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as T;
}

export function getTodos(limit: number, skip: number, signal?: AbortSignal): Promise<TodosResponse> {
  return request<TodosResponse>(`${BASE_URL}?limit=${limit}&skip=${skip}`, { signal });
}

export function addTodo(newTodo: NewTodo): Promise<Todo> {
  return request<Todo>(`${BASE_URL}/add`, {
    method: 'POST',
    body: JSON.stringify(newTodo),
  });
}

export function updateTodo(id: number, changes: TodoChanges): Promise<Todo> {
  return request<Todo>(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
}

export function deleteTodo(id: number): Promise<DeletedTodo> {
  return request<DeletedTodo>(`${BASE_URL}/${id}`, { method: 'DELETE' });
}
