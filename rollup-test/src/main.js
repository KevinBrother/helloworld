import { version } from '../package.json';

export default function () {
  console.log('version ' + version);

  import('./foo.js').then(({ default: foo }) => {
    console.log(foo());
  });
}
