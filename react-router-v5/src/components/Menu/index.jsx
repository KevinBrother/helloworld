import React, { Component } from 'react';
import { NavLink, Switch, Route, Redirect } from 'react-router-dom';
import Home from '../../pages/Home';
import About from '../../pages/About';
export default class Menu extends Component {
  render() {
    return (
      <div className="row">
        <div className="col-4">
          <ul>
            <li>
              <NavLink to="/about" className="nav-link">
                about
              </NavLink>
            </li>
            <li>
              <NavLink to="/home" className="nav-link">
                home
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="col-auto">
          <div className="nav">
            <Switch>
              <Route path="/about" component={About}></Route>
              <Route path="/home" component={Home}></Route>
              <Redirect to="/about" />
            </Switch>
          </div>
        </div>
      </div>
    );
  }
}
