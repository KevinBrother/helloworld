console.log('welcome to worker!!!');

const url = 'http://100.200.26.250:8000/';

const run = () => {
  return fetch(url + '?' + Math.random().toString()).then((response) => response.json());
};
/* let count = 10;

while (count > 0) {
  run().then((data) => console.log('%c [ data ]-17', 'font-size:13px; background:pink; color:#bf2c9f;', data));
  count--;
}
 */

setInterval(() => {
  run().then((data) => console.log('%c [ data ]-17', 'font-size:13px; background:pink; color:#bf2c9f;', data));
}, 1000);
