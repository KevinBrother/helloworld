// config的默认值定义的地方

const { isWindows } = require('../is-windows');
const os = require('os');

// const cacheRoot = (isWindows && process.env.LOCALAPPDATA) || '~';
const cacheRoot = (isWindows && process.env.LOCALAPPDATA) || os.homedir();
const cacheExtra = isWindows ? 'npm-cache' : '.npm';
const cache = `${cacheRoot}/${cacheExtra}`;

module.exports = { cache };