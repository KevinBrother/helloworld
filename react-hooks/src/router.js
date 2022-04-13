import Drag from './pages/Drag';
import RequestPage from './pages/RequestPage';
import Form from './pages/Form';
import Test from './pages/Test';
import Counter from './pages/Counter';
import AsyncUsers from './pages/AsyncUsers';
import WindowSize from './pages/WindowSize';
import RefDemo from './pages/RefDemo';

const menuRouter = [
  {
    path: '/drag',
    element: <Drag />
  },
  {
    path: '/requestPage',
    element: <RequestPage />
  },
  {
    path: '/form',
    element: <Form />
  },
  {
    path: '/test',
    element: <Test />
  },
  {
    path: '/counter',
    element: <Counter />
  },
  {
    path: '/asyncUsers',
    element: <AsyncUsers />
  },
  {
    path: '/windowSize',
    element: <WindowSize />
  },
  {
    path: '/RefDemo',
    element: <RefDemo />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
