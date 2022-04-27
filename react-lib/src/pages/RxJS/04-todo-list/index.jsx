import React from 'react';
import { TodoService } from './TodoService.js';
import { useInstance } from './hooks';
import { useObservable } from 'rxjs-hooks';

export default function TodoList() {
  const todoService = useInstance(TodoService);
  const todoList = useObservable(() => todoService.todoList$, []);
  const loading = useObservable(() => todoService.loading$, false);

  return (
    <div>
      <div>
        {todoList.map((todo) => (
          <div key={todo.id}>
            <input type="checkbox" checked={todo.done}></input>
            <span>{todo.name}</span>
          </div>
        ))}
        <div>{loading}</div>
      </div>
    </div>
  );
}
