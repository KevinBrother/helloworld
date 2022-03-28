import React from 'react';

import Header from './components/Header';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import './index.css';
import About from './pages/About';
import Home from './pages/Home';

export default function App() {
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
            <div className="nav">
              <Routes>
                <Route path="/about/*" element={<About />}></Route>
                <Route path="/home/*" element={<Home></Home>}></Route>
                <Route
                  path="/*"
                  element={<Navigate to="/about"></Navigate>}
                ></Route>
              </Routes>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
