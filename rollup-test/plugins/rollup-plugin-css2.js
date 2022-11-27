// rollup 插件辅助方法，下面这个方法用于生成过滤规则
import { createFilter } from '@rollup/pluginutils';
// CSS 转译器
import transformer from '@parcel/css';
import path from 'path';

console.log('=====rollup-plugin-css2 start!!!!');
const isString = (val) => typeof val === 'string';

const isFunction = (val) => typeof val === 'function';

// 生成插件的工厂方法
export default function pluginGenerator(customOptions = {}) {
  // 合并插件选项
  const options = {
    include: ['**/*.css'],
    exclude: [],
    transformOptions: {
      minify: false,
      targets: {},
      drafts: {
        nesting: false
      }
    },
    ...customOptions
  };

  // rollup 推荐每一个 transform 类型的插件都需要提供 include 和 exclude 选项，生成过滤规则
  // 主要用于限制插件作用的文件范文，避免误伤其他文件
  const filter = createFilter(options.include, options.exclude);
  // 存储 CSS 代码
  const styles = new Map();
  // 记录引入 CSS 文件的顺序
  const orders = new Set();

  // 返回插件
  return {
    // 插件名称
    name: 'css2',

    // transform 钩子
    async transform(code, id) {
      // 不符合过滤规则的，不处理
      if (!filter(id)) return;
      console.log(
        '%c [ transform =======]-43',
        'font-size:13px; background:pink; color:#bf2c9f;',
        'code',
        code,
        'id',
        id
      );

      // 去除 CSS 转换器的选项
      const { minify, targets, drafts } = options.transformOptions;

      // 转换 CSS 代码
      const { code: transformCode } = await transformer.transform({
        code: Buffer.from(code),
        filename: id,
        minify,
        targets,
        drafts
      });

      const css = transformCode.toString();
      // 存储 CSS 代码
      styles.set(id, css);
      // 设置顺序
      if (!orders.has(id)) {
        orders.add(id);
      }

      // 返回转换后的内容，包装成一个合法的 ESM 模块
      return {
        code: `export default ${JSON.stringify(css)}`,
        map: { mappings: '' }
      };
    },

    // generateBundle 钩子
    generateBundle(opts) {
      console.log(
        '%c [ opts ]-83',
        'font-size:13px; background:pink; color:#bf2c9f;',
        opts
      );
      // 合并 CSS 代码
      let css = '';
      orders.forEach((id) => {
        console.log(
          '%c [ id ]-86',
          'font-size:13px; background:pink; color:#bf2c9f;',
          id
        );
        css += styles.get(id) ?? '';
      });

      const { output } = options;

      // 如果选项传入是一个函数，调用该函数
      if (isFunction(output)) {
        output(css, styles);
        return;
      }

      console.log(
        '%c [ css ]-103',
        'font-size:13px; background:pink; color:#bf2c9f;',
        css,
        output
      );
      // if (css.length <= 0 || !output) return;

      // 解析文件名称
      const name = isString(output) ? output.trim() : opts.file ?? 'bundle.js';

      const dest = path.basename(name, path.extname(name));
      console.log(
        '%c [ dest ]-114',
        'font-size:13px; background:pink; color:#bf2c9f;',
        dest
      );
      if (dest) {
        // 调用 rollup 暴露给钩子函数的函数，生成静态文件
        this.emitFile({ type: 'asset', source: css, fileName: `${dest}.css` });
      }
    }
  };
}
