module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [
    [
      'import',
      {
        libraryName: 'antd',
        libraryDirectory: 'lib',
        style: function (name) {
          console.log('#######', name);
          return `${name}/style/index.css`;
        }
      }
    ]
  ]
};
