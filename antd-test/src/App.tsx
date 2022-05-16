import React from 'react'
import { useRoutes, Link } from 'react-router-dom';

import { baseRouter, menuRouter } from '../router';

function Container() {
  const element = useRoutes(menuRouter.concat(baseRouter));
  return <div style={{ marginLeft: '30px' }}>{element}</div>;
}

function App() {
  return (
    <>
      <div style={{ display: 'flex' }}>
        <ul>
          {menuRouter.map((router) => {
            const { path } = router;

            return (
              <li key={path}>
                <Link to={path}>{path.replace('/', '')}</Link>
              </li>
            );
          })}
        </ul>
        <Container />
      </div>
    </>
  );
}

export default App;