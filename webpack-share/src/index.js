import { sum } from './utils/sum';
import './index.css';
import './index.less';
import './index.png';

document.write(sum(1, 2));

if (module.hot) {
  module.hot.accept('./utils/sum');
}
