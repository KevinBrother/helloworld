const cheerio = require('cheerio');
const fs = require('fs');

// 读取最新的HTML文件
const htmlContent = fs.readFileSync('debug/page-1755163029661.html', 'utf8');

console.log('原始HTML长度:', htmlContent.length);
console.log('HTML包含<a标签:', htmlContent.includes('<a '));
console.log('HTML包含href属性:', htmlContent.includes('href='));

// 尝试修复可能的HTML格式问题
let cleanHtml = htmlContent;
if (!htmlContent.includes('<!DOCTYPE')) {
  cleanHtml = `<!DOCTYPE html>${htmlContent}`;
}

console.log('清理后HTML长度:', cleanHtml.length);

// 使用与服务器相同的配置加载cheerio
const $ = cheerio.load(cleanHtml, {
  xmlMode: false
});

console.log('cheerio解析结果:');
console.log('- html标签数量:', $('html').length);
console.log('- body标签数量:', $('body').length);
console.log('- 总元素数量:', $('*').length);
console.log('- a标签数量:', $('a').length);
console.log('- a[href]标签数量:', $('a[href]').length);

// 检查cheerio解析后的HTML
const cheerioHtml = $.html();
console.log('cheerio解析后的HTML长度:', cheerioHtml.length);
console.log('cheerio解析后的HTML前500字符:');
console.log(cheerioHtml.substring(0, 500));

// 测试直接查找a标签
const testATags = $.html().match(/<a[^>]*>/g);
console.log('正则表达式找到的a标签数量:', testATags ? testATags.length : 0);

// 打印前几个a标签
console.log('\n前5个a标签:');
$('a').slice(0, 5).each((index, element) => {
  console.log(`${index}: ${$(element).toString()}`);
});