const path = require('path');
module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    static: __dirname + 'dist'
  }
};

/* { allowedHosts?, 
  bonjour?, client?, 
  compress?, devMiddleware?,
   headers?, historyApiFallback?,
    host?, hot?, http2?, https?, ipc?, l
    iveReload?, magicHtml?, onAfterSetupMiddleware?, 
    onBeforeSetupMiddleware?, onListening?, open?, port?, proxy?, server?, 
    setupExitSignals?, setupMiddlewares?, static?, 
    watchFiles?, webSocketServer? } */
