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
    import('../components/Text.js').then((text) => {
      console.log('text=======', text);
      Text = text.default;
      setHasText(true);
    });
  };

  return (
    <>
      {console.log(12)}
      {hasText ? <Text /> : null}
      <div>this is index 的jsx {getA}</div>
      <img src={logo} alt="" onClick={getText} />
      {/* <img src={logo} alt="" /> */}
    </>
  );
}

ReactDom.render(<Foo />, document.getElementById('root'));
