import React, { useState } from 'react';
import ReactDom from 'react-dom';
import './default.less';
import { getA } from './tree-shaking';
// import Text from '../components/Text';
import logo from './logo.png';

if (false) {
  console.log('这句也会被tree-shaking掉');
}

function Foo() {
  const [hasText, setHasText] = useState(false);
  let Text = null;
  const getText = () => {
    import('../components/Text').then((text) => {
      // TODO 2022年4月10日 15:35:07 react 通过setState,改变组件渲染的问题不知到如何修复
      Text = text.default;
      console.log('text=======', Text);
      setHasText(true);
    });
  };

  return (
    <>
      {console.log(12)}
      {hasText ? <Text /> : null}
      <div>
        this is index 的jsx
        {getA}
      </div>
      <img src={logo} alt="" />
      {/* <img src={logo} alt="" onClick={getText} /> */}
      <button onClick={getText}>加载text组件</button>
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
