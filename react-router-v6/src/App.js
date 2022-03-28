import React from 'react';
import { NavLink, useRoutes } from 'react-router-dom';
import Header from './components/Header';
import router from './router';
import './index.css';

export default function App() {
  const elements = useRoutes(router);

  function isActiveLink({ isActive }) {
    return isActive ? 'nav-list active' : 'nav-list';
  }

  return (
    <div className="container border">
      <header className="header border">
        <Header />
      </header>
      <main>
        <div className="row">
          <div className="col-4">
            <ul>
              <li>
                <NavLink to="/about" className={isActiveLink}>
                  about
                </NavLink>
              </li>
              <li>
                <NavLink to="/home" className={isActiveLink} end>
                  home
                </NavLink>
              </li>
            </ul>
          </div>
          <div className="col-auto">
            <div className="nav">{elements}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
