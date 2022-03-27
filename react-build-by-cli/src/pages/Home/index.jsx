import React, { Component } from 'react';
import { Switch, Route, NavLink } from 'react-router-dom';
import Message from './components/Message';
import News from './components/News';
export default class Home extends Component {
  render() {
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

        <Switch>
          <Route path="/home/news" component={News}></Route>
          <Route path="/home/message" component={Message}></Route>
        </Switch>
      </div>
    );
  }
}
