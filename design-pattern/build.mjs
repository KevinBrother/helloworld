#!/usr/bin/env zx

const { tag } = argv;

const distMap = {
  factory: '创建型/工厂模式',
  abstractFactory: '创建型/抽象工厂模式',
  singleton: '创建型/单例模式',
  builder: '创建型/建造者模式',
  // =========
  decorator: '结构型/装饰器模式',
  adapter: '结构型/适配器模式',
  bridge: '结构型/桥模式',
  composite: '结构型/组合模式',
  flyweight: '结构型/享元模式',
  proxy: '结构型/代理模式',
  // ===
  chain: '行为型/责任链模式',
  command: '行为型/命令模式',
  iterator: '行为型/迭代器模式'
};

const distValue = distMap[tag];

const tsconfigPath = './tsconfig.json';
const tsconfig = await fs.readJson(tsconfigPath);

tsconfig.include = [`./src/${distValue}`];
await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
await $`rm -rf dist && tsc && node ./dist/index.js`;
