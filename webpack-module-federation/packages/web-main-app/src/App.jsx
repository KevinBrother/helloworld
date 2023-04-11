import React from 'react';
import Example1 from 'component-app/Example';
import Example2 from 'component-app/Example2';
import TransferParams from 'component-app/TransferParams';
import { add } from 'lib-demo/index';
// or
// const Example1 = React.lazy(() => import('component-app/Example'));
// const Example2 = React.lazy(() => import('component-app/Example2'));
// const AppFromB = React.lazy(() => import('component-app/App'));

function wrap(a, b) {
  const result = add(a, b);
  console.log('%c [ result ]-12', 'font-size:13px; background:pink; color:#bf2c9f;', result);
}

function App() {
  return (
    <div>
      <p>this is applicatin a</p>
      <p>下面是从另外一个应用动态加载过来的</p>
      <Example1 />
      <Example2 />
      <button onClick={() => wrap(1, 2)}>调用lib-demo库的函数</button>
      <TransferParams name="main-app" fn={() => wrap(3, 4)} />
      {/* <AppFromB></AppFromB> */}
    </div>
  );
}

export default App;
