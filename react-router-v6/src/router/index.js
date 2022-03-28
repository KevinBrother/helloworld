import { Navigate } from 'react-router-dom';
import About from '../pages/About';
import Home from '../pages/Home';
import Message from '../pages/Home/components/Message';
import Detail from '../pages/Home/components/Message/Detail';
import News from '../pages/Home/components/News';

const routers = [
  {
    path: '/about/*',
    element: <About />
  },
  {
    path: '/home/*',
    element: <Home />,
    children: [
      {
        path: 'news',
        element: <News />
      },
      {
        path: 'message/*',
        element: <Message />,
        children: [
          {
            // path: 'detail/:id/:name',
            path: 'detail',
            element: <Detail />
          }
        ]
      }
    ]
  },
  {
    path: '/*',
    element: <Navigate to="/about" />
  }
];

export default routers;
