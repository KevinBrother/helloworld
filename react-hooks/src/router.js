import Drag from './pages/Drag';
import RequestPage from './pages/RequestPage';
import Form from './pages/Form';
import Test from './pages/Test';

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
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
