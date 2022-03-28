import React, { Component } from 'react';
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
      </div>
    );
  }
}
