import Echarts from './pages/echarts';

const menuRouter = [
  {
    path: '/Echarts',
    element: <Echarts />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };
