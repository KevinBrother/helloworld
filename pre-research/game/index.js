const { getRandomMora, compare } = require('./lib/game');
const peopleMora = process.argv.at(-1);
console.log('[ peopleMora ] >', peopleMora);

function run() {
  const computer = getRandomMora();
  compare(peopleMora, computer);
}

run();
