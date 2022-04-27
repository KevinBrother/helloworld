import Echarts from './pages/echarts';
import FirstRX from './pages/RxJS/01-First.jsx';
import RxJSHooks from './pages/RxJS/02-rxjs-hooks';
import RxJSOperator from './pages/RxJS/03-operator';
import ToDoList from './pages/RxJS/04-todo-list';
import { MotionBall } from './pages/RxJS/05-ball/index.tsx';

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
    path: '/MotionBall',
    element: <MotionBall />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
