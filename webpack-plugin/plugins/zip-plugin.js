const JSZip = require('jszip');
const RawSource = require('webpack-sources').RawSource;
const path = require('path');

module.exports = class ZipPlugin {
  constructor(option) {
    this.option = option;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('ZipPlugin', (compilation, callback) => {
      const { filename } = this.option;
      // console.log('welcome to my plugin', this.option, compilation);
      const zip = new JSZip();
      const folder = zip.folder(filename);

      for (const filename in compilation.assets) {
        folder.file(filename, compilation.assets[filename].source());
      }

      zip.generateAsync({ type: 'nodebuffer' }).then(function (content) {
        const outputPath = path.join(
          compilation.options.output.path,
          filename + '.zip'
        );

        const outputRelativePath = path.relative(
          compilation.options.output.path,
          outputPath
        );

        compilation.assets[outputRelativePath] = new RawSource(content);

        callback();
      });
    });
  }
};
