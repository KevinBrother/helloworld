import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  tap,
  from,
  switchMap
} from 'rxjs';
import { ToDoApi } from './ToDoApi';

export class TodoService {
  // TODO 为什么要通过这个来生成？是英文需要通过subject来广播吗？
  #refresh$ = new BehaviorSubject(0);
  #LoadingSource$ = new BehaviorSubject(false);

  loading$ = this.#LoadingSource$.asObservable();
  todoList$ = combineLatest(this.#refresh$).pipe(
    debounceTime(250),
    tap(() => {
      this.LoadingSource$.next(true);
    }),
    switchMap(() => {
      return from(ToDoApi.requestList());
    }),
    tap((res) => {
      this.LoadingSource$.next(false);
    })
  );

  refresh() {
    this.#refresh$.next(Math.random());
  }
}
