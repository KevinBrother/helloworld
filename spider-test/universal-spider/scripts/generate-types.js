const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Swagger API 地址
const SWAGGER_URL = 'http://localhost:3001/api/docs-json';

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../shared/src/types');

// 类型映射
const typeMapping = {
  string: 'string',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
  array: 'Array',
  object: 'object'
};

// 生成 TypeScript 接口
function generateInterface(name, schema) {
  if (!schema || !schema.properties) {
    return `export interface ${name} {
  [key: string]: any;
}`;
  }

  const properties = Object.entries(schema.properties)
    .map(([propName, propSchema]) => {
      const isRequired = schema.required && schema.required.includes(propName);
      const optional = isRequired ? '' : '?';
      const type = getTypeFromSchema(propSchema);
      const description = propSchema.description ? `  /** ${propSchema.description} */\n` : '';
      return `${description}  ${propName}${optional}: ${type};`;
    })
    .join('\n');

  return `export interface ${name} {\n${properties}\n}`;
}

// 从 schema 获取类型
function getTypeFromSchema(schema) {
  if (!schema) return 'any';
  
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName;
  }
  
  if (schema.type === 'array') {
    const itemType = getTypeFromSchema(schema.items);
    return `${itemType}[]`;
  }
  
  if (schema.enum) {
    return schema.enum.map(val => `'${val}'`).join(' | ');
  }
  
  return typeMapping[schema.type] || 'any';
}

// 生成 API 响应类型
function generateApiTypes(swaggerDoc) {
  const types = [];
  
  // 生成模型类型
  if (swaggerDoc.components && swaggerDoc.components.schemas) {
    Object.entries(swaggerDoc.components.schemas).forEach(([name, schema]) => {
      types.push(generateInterface(name, schema));
    });
  }
  
  return types.join('\n\n');
}

// 主函数
async function generateTypes() {
  try {
    console.log('正在获取 Swagger 文档...');
    const response = await axios.get(SWAGGER_URL);
    const swaggerDoc = response.data;
    
    console.log('正在生成类型定义...');
    const apiTypes = generateApiTypes(swaggerDoc);
    
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // 写入生成的类型文件
    const outputFile = path.join(OUTPUT_DIR, 'generated-api.types.ts');
    const content = `// 此文件由脚本自动生成，请勿手动修改\n// Generated at: ${new Date().toISOString()}\n\n${apiTypes}`;
    
    fs.writeFileSync(outputFile, content, 'utf8');
    
    console.log(`类型定义已生成到: ${outputFile}`);
    console.log('生成完成！');
    
  } catch (error) {
    console.error('生成类型定义时出错:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('请确保后端服务正在运行 (http://localhost:3001)');
    }
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  generateTypes();
}

module.exports = { generateTypes };