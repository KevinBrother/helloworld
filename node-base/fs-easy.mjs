import { writeFile } from 'node:fs/promises';

writeFile('te1212st.txt', 'Hello, World!', {
  encoding: 'utf8'
}).then((rst) => {
  console.log(
    '%c [ writeFile ]-47',
    'font-size:13px; background:pink; color:#bf2c9f;',
    rst
  );
});
