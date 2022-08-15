import Echarts from './pages/echarts';
import FirstRX from './pages/RxJS/01-First.jsx';
import RxJSHooks from './pages/RxJS/02-rxjs-hooks';
import RxJSOperator from './pages/RxJS/03-operator';
import ToDoList from './pages/RxJS/04-todo-list';
import { PasswordLevel } from './pages/password-level';
import UseRequest from './pages/AHooks/UseRequest';
import JsxVarTag from './pages/jsx-var-tag';
import DropAble from './pages/DropAble';

const menuRouter = [
  {
    path: '/Echarts',
    element: <Echarts />
  },
  {
    path: '/firstRX',
    element: <FirstRX />
  },
  {
    path: '/RxJSHooks',
    element: <RxJSHooks />
  },
  {
    path: '/RxJSOperator',
    element: <RxJSOperator />
  },
  {
    path: '/ToDoList',
    element: <ToDoList />
  },
  {
    path: '/PasswordLevel',
    element: <PasswordLevel />
  },
  {
    path: '/UseRequest',
    element: <UseRequest />
  },
  {
    path: '/DropAble',
    element: <DropAble />
  },
  {
    path: '/JsxVarTag',
    element: <JsxVarTag />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
