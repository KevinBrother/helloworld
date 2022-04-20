const MORA = {
  ROCK: 'rock',
  SCISSORS: 'Scissors',
  PAPER: 'paper'
};

exports.getRandomMora = () => {
  const random = Math.random() * 3;

  let computer;
  if (random < 1) {
    computer = MORA.ROCK;
  } else if (random > 2) {
    computer = MORA.SCISSORS;
  } else {
    computer = MORA.PAPER;
  }
  return computer;
};

exports.compare = (a, b) => {
  if (a === b) {
    console.log('平局');
    return 0;
  } else if (
    (a === MORA.ROCK && b === MORA.PAPER) ||
    (a === MORA.SCISSORS && b === MORA.ROCK) ||
    (a === MORA.PAPER && b === MORA.SCISSORS)
  ) {
    console.log('你输了');
    return 1;
  } else {
    console.log('你赢了');
    return -1;
  }
};
