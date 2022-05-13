const Spritesmith = require('spritesmith');
const fs = require('fs');
const path = require('path');

const sprites = [
  path.resolve(__dirname, '../', './src/images/auth.png'),
  path.resolve(__dirname, '../', './src/images/stats.jpg')
];

Spritesmith.run(
  {
    src: sprites
  },
  function handleResult(err, result) {
    console.log(result);
    if (err) {
      throw err;
    }

    // Output the image
    fs.writeFileSync(
      path.resolve(__dirname, '../', './dist/sprite.png'),
      result.image
    );
  }
);
