import React from 'react'
import Hello from '../pages/Hello';
import Message from '../pages/Message';

const menuRouter = [
  {
    path: '/Hello',
    element: <Hello />
  },
  {
    path: '/Message',
    element: <Message />
  }
];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };