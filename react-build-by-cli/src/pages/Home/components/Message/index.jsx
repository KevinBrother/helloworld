import React, { Component } from 'react';
import { Link, Route } from 'react-router-dom';
import Detail from './Detail';

const users = [
  { id: '01', name: 'John', age: 34 },
  { id: '02', name: 'kevin', age: 24 },
  { id: '03', name: 'brother', age: 34 }
];

export default class Message extends Component {
  render() {
    return (
      <div>
        <ul>
          {users.map((user) => {
            const { id, name } = user;
            return (
              <li key={id}>
                {/* 1. params方式 */}
                {/* <Link to={`/home/message/detail/${id}/${name}`}>
                  {name}
                </Link> */}
                {/* 2. search方式 */}
                {/*  <Link to={`/home/message/detail?id=${id}&${name}`}>
                  {name}
                </Link> */}
                {/* 3. state方式 */}
                <Link to={{ pathname: '/home/message/detail', id, name }}>
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
        <hr />
        {/* <Route path="/home/message/detail/:id/:name" component={Detail} /> */}
        {/* <Route path="/home/message/detail/" component={Detail} /> */}
        <Route path="/home/message/detail/" component={Detail} />
      </div>
    );
  }
}
