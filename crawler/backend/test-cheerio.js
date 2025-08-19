const cheerio = require('cheerio');
const fs = require('fs');

// 读取HTML文件
const html = fs.readFileSync('./debug/page-1755162401387.html', 'utf8');

console.log('HTML长度:', html.length);
console.log('HTML包含<a标签:', html.includes('<a '));
console.log('HTML包含href属性:', html.includes('href='));

// 使用cheerio解析
const $ = cheerio.load(html, { xmlMode: false });

console.log('cheerio解析结果:');
console.log('- html标签数量:', $('html').length);
console.log('- body标签数量:', $('body').length);
console.log('- 总元素数量:', $('*').length);
console.log('- a标签数量:', $('a').length);
console.log('- a[href]标签数量:', $('a[href]').length);

// 打印前5个a标签
console.log('\n前5个a标签:');
$('a').slice(0, 5).each((index, element) => {
  console.log(`${index}: ${$(element).toString()}`);
});

// 正则表达式测试
const regexMatches = html.match(/<a[^>]*>/g);
console.log('\n正则表达式找到的a标签数量:', regexMatches ? regexMatches.length : 0);

if (regexMatches) {
  console.log('前5个正则匹配结果:');
  regexMatches.slice(0, 5).forEach((match, index) => {
    console.log(`${index}: ${match}`);
  });
}