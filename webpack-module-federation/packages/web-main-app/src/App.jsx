import React from 'react';
import Example1 from 'component-app/Example';
import Example2 from 'component-app/Example2';
import { add } from 'lib-demo/index';
import { DefaultFolders } from 'studio-local-lib/utils';
console.log('%c [ add ]-5', 'font-size:13px; background:pink; color:#bf2c9f;', add, DefaultFolders);
// or
// const Example1 = React.lazy(() => import('component-app/Example'));
// const Example2 = React.lazy(() => import('component-app/Example2'));
// const AppFromB = React.lazy(() => import('component-app/App'));

function App() {
  return (
    <div>
      <p>this is applicatin a</p>
      <Example1 />
      <Example2 />
      <p>下面是从另外一个应用动态加载过来的</p>
      {/* <AppFromB></AppFromB> */}
    </div>
  );
}

export default App;
