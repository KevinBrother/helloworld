import React from 'react'
import Hello from '../pages/Hello';

const menuRouter = [
  {
    path: '/Hello',
    element: <Hello />
  },

];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };