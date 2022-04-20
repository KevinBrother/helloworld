const { getRandomMora, compare } = require('./lib/game');
const peopleMora = process.argv.at(-1);
console.log('[ peopleMora ] >', peopleMora);

function run(peopleMora) {
  const computer = getRandomMora();
  return compare(peopleMora, computer);
}

let count = 0;
process.stdin.on('data', function (e) {
  const peopleMora = e.toString().trim();
  const result = run(peopleMora);

  if (result === -1) {
    count++;
  }

  if (count === 3) {
    console.log('你太厉害了，我不玩了！');
    process.exit();
  }
});
