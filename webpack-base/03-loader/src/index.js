import { component } from '../../utils';
import desc from './desc.txt';
import './style.css';
import './default.less';

console.log('[ a ] >', desc);
document.body.appendChild(component(desc));
