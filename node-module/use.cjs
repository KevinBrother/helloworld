// cjs 加载是同步的
console.log('start');

let pkg = (async () => {
  pkg = await import('./use.mjs');
  console.log(
    '%c [ pkg - inner ]',
    'font-size:13px; background:pink; color:#bf2c9f;',
    pkg
  );
})();

console.log(
  '%c [ pkg - outer]',
  'font-size:13px; background:pink; color:#bf2c9f;',
  pkg
);
