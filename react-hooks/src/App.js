import { useRoutes, Link } from 'react-router-dom';
import { baseRouter, menuRouter } from './router';

function Ad() {
  const element = useRoutes(menuRouter.concat(baseRouter));
  return <>{element}</>;
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
        <Ad />
      </div>
    </>
  );
}

export default App;
