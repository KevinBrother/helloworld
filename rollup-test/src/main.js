import { version } from '../package.json';
import './styles/first.css';

export default function () {
  console.log('version ' + version);

  import('./foo.js').then(({ default: foo }) => {
    console.log(foo());
  });
}
