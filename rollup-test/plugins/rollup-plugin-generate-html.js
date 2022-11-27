export default function pluginGenerator(customOptions = {}) {
  // TODO 多入口配置 合并插件选项

  // 返回插件
  return {
    // 插件名称
    name: 'generate-html',

    generateBundle(opts) {
      console.log(
        '%c [ opts.format ]-11',
        'font-size:13px; background:pink; color:#bf2c9f;',
        opts.format
      );
      if (opts.format !== 'es') {
        return;
      }

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Title</title>
  </head>
  <body>
    <script src="${opts.file}" type="module"></script>
  </body>
</html>
`
      });
    }
  };
}
