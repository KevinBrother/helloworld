import Count from './containers/count.js';
import store from './redux/store';

function App() {
  return (
    <div>
      <Count store={store} />
    </div>
  );
}

export default App;
