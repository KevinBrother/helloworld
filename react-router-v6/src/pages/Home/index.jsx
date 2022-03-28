import React from 'react';
import { Routes, Route, NavLink, Outlet } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <div className="nav">
        <NavLink className="nav-link" to="/home/news">
          news
        </NavLink>

        <NavLink className="nav-link" to="/home/message">
          message
        </NavLink>
      </div>
      <Outlet></Outlet>
    </div>
  );
}
