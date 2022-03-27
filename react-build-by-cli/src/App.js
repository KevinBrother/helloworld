import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import Header from './components/Header';
import Menu from './components/Menu';
import './index.css';
export default class App extends Component {
  render() {
    return (
      <div className="container border">
        <header className="header border">
          <Header />
        </header>
        <main>
          <Menu></Menu>
        </main>

        {/*   <header className="border-bottom">
          <h1>header</h1>
        </header>
        <div className="menu row">
          <aside className="col-4 border-end">
              <ul className="my-ul-li-rest-bottom-border">
              <li>121212</li>
              <li>121212</li>
              <li>121212</li>
            </ul>
            <ul className="nav">
              <NavLink className="nav-link">121212</NavLink>
              <li className="nav-link">121212</li>
              <li className="nav-link">121212</li>
            </ul>
          </aside>
          <main className="col-auto">
            <h1>vuyc</h1>
          </main>
        </div> */}
      </div>
    );
  }
}
