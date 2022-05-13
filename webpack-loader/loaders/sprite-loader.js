const path = require('path');
const Spritesmith = require('spritesmith');
const fs = require('fs');

module.exports = function (source) {
  const callback = this.async();
  const imgs = source.match(/url\((\S*)\?__sprite/g);

  const matchedImgs = [];

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i].match(/url\((\S*)\?__sprite/)[1];
    matchedImgs.push(path.resolve(__dirname, img));
  }

  console.log(
    '%c [ imgs ]-5',
    'font-size:13px; background:pink; color:#bf2c9f;',
    matchedImgs
  );

  Spritesmith.run(
    {
      src: matchedImgs
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

      source = source.replace(/url\((\S*)\?__sprite/g, function (match, p1) {
        return `url("dist/sprite.png"`;
      });

      callback(null, source);
    }
  );
};
