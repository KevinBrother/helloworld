#!/usr/bin/env zx

const { tag } = argv;

const distMap = {
  builder: '建造者模式',
  decorator: '装饰器模式'
};

const distValue = distMap[tag];

const tsconfigPath = './tsconfig.json';
const tsconfig = await fs.readJson(tsconfigPath);

tsconfig.include = [`./src/${distValue}`];
await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
await $`rm -rf dist && tsc && node ./dist/index.js`;
