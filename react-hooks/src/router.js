import Drag from './pages/Drag';
import RequestPage from './pages/RequestPage';
import Form from './pages/Form';
import Test from './pages/Test';
import Counter from './pages/Counter';
import AsyncUsers from './pages/AsyncUsers';
import WindowSize from './pages/WindowSize';
import RefDemo from './pages/RefDemo';
import ContextDemo from './pages/ContextDemo';
import PriceInput from './pages/PriceInput';
import RenderProps from './pages/RenderProps';
import Keyboard from './pages/Keyboard';
import Summary from './pages/Summary';
import MyState from './pages/MyState';
import ToRequest from './pages/ToRequest';

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
    path: '/MyState',
    element: <MyState />
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
  },
  {
    path: '/ContextDemo',
    element: <ContextDemo />
  },
  {
    path: '/PriceInput',
    element: <PriceInput />
  },
  {
    path: '/RenderProps',
    element: <RenderProps />
  },
  {
    path: '/Keyboard',
    element: <Keyboard />
  },
  {
    path: '/Summary',
    element: <Summary />
  },
  {
    path: '/ToRequest',
    element: <ToRequest />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
