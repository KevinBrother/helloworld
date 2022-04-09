import { component } from '../../utils';
import desc from './asset/desc.txt';
import './asset/style.css';
import './asset/default.less';

console.log('[ a ] >', desc);
document.body.appendChild(component(desc));
