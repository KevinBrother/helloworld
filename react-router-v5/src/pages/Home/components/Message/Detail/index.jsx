import React, { Component } from 'react';
import qs from 'querystring';

const users = [
  { id: '01', name: 'John', age: 34 },
  { id: '02', name: 'kevin', age: 24 },
  { id: '03', name: 'brother', age: 34 }
];

export default class Detail extends Component {
  render() {
    console.log('[ this.props ] >', this.props);
    // =================第一种方式=====================
    // const { id } = this.props.match.params;

    // =================第二种方式
    // const { id, name } = qs.parse(this.props.location.search.slice(1));

    // =================第三种方式 ？？为什不是state对象里了？？版本不一致？
    const { id, name } = this.props.location;

    const currentUser = users.find((user) => user.id === id) || {};

    return (
      <div>
        <div>
          <ul>
            <li>ID：{currentUser.id}</li>
            <li>姓名：{currentUser.name}</li>
            <li>年龄：{currentUser.age}</li>
          </ul>
        </div>
      </div>
    );
  }
}
