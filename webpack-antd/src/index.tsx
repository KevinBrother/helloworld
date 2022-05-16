import React from 'react';
import ReactDom from 'react-dom';
import { Button } from 'antd';
import './App.css';

const App = () => (
  <div className="App">
    <Button type="primary">Button</Button>
  </div>
);


ReactDom.render(<App />, document.getElementById('root'));
