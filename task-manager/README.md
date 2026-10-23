# Task Manager

A small Kanban-style task manager built with **React + TypeScript + Vite**.
Tasks are loaded from the fake REST API [dummyjson.com/todos](https://dummyjson.com/docs/todos)
and shown on a board with two columns: **To Do** and **Done**.

> dummyjson does not really save changes, so every create / update / delete is
> also applied to local React state. Tasks created in the app exist only locally,
> so the app does not send PUT/DELETE requests for them.

## How to run

```bash
npm install
npm run dev       # start the dev server, then open the URL it prints
npm run build     # type-check and build for production
npm run lint      # run oxlint
```

## Features

- Create, read, update and delete tasks
- Drag & drop cards between "To Do" and "Done" (mouse, touch and keyboard) using `@dnd-kit/core`
- Filter by status: All / To Do / Done
- Pagination: 10 tasks per page, Prev / Next, "Page X of Y"
- Loading spinner while tasks load; small spinner and disabled buttons while a task is being saved
- Error messages with a "Try again" button, and the page keeps working
- Confirmation before deleting
- Responsive layout: columns stack on mobile and sit side by side on tablet and desktop
- Strict TypeScript (no `any`), re-render optimizations with `React.memo`, `useCallback` and `useMemo`

## Project structure

```
src/
  api/todos.ts            fetch functions (getTodos, addTodo, updateTodo, deleteTodo)
  types/todo.ts           Todo, TodosResponse, Filter and other types
  hooks/useTodos.ts       state and logic: loading, errors, page, filter, CRUD handlers
  components/
    Board.tsx             drag & drop context with the two columns
    Column.tsx            one column (drop zone)
    TaskCard.tsx          one draggable task card (React.memo)
    TaskForm.tsx          add a new task / edit an existing one
    Filter.tsx            All / To Do / Done buttons
    Pagination.tsx        Prev / Next and "Page X of Y"
    Loader.tsx            spinner
    ErrorMessage.tsx      error box with "Try again"
  App.tsx                 puts everything together
```
