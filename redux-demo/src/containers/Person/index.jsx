import React, { Component } from 'react';
import { connect } from 'react-redux';
import { addPersonAction } from '../../redux/actions/person';
import { nanoid } from 'nanoid';

class Person extends Component {
  addPerson = () => {
    const name = this.name.value;
    const age = this.age.value;
    const person = { id: nanoid(), name, age };

    this.props.addPerson(person);

    this.name.value = '';
    this.age.value = '';
  };

  render() {
    console.log('[ this.props ] >', this.props);
    return (
      <div>
        <h1>上面的结果为 {this.props.count}</h1>
        姓名：
        <input ref={(c) => (this.name = c)} type="text" />
        年龄：
        <input ref={(c) => (this.age = c)} type="text" />
        <button onClick={this.addPerson}>添加</button>
        <ul>
          {this.props.persons.map((person) => {
            const { id, name, age } = person;
            return (
              <li key={id}>
                {name} ----- {age}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default connect(
  (state) => ({ count: state.count, persons: state.person }),
  {
    addPerson: addPersonAction
  }
)(Person);
