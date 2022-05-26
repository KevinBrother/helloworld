import React from 'react'
import Hello from '../pages/Hello';
import MultiModal from '../pages/multi-modal';

const menuRouter = [
  {
    path: '/Hello',
    element: <Hello />
  },
  {
    path: '/multi-modal',
    element: <MultiModal />
  },

];

const baseRouter = [
  {
    path: '*',
    element: <>Welcome to hooks</>
  }
];

export { menuRouter, baseRouter };