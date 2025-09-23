import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();

// 创建上传目录
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

// 解析 multipart/form-data 的函数
function parseMultipartData(req: express.Request): Promise<{ fields: any, files: any[] }> {
  return new Promise((resolve, reject) => {
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return reject(new Error('No boundary found'));
    }

    let body = Buffer.alloc(0);
    const files: any[] = [];
    const fields: any = {};

    req.on('data', (chunk) => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', () => {
      try {
        const parts = body.toString().split(`--${boundary}`);
        
        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const lines = part.split('\r\n');
            const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
            
            if (dispositionLine) {
              const nameMatch = dispositionLine.match(/name="([^"]+)"/);
              const filenameMatch = dispositionLine.match(/filename="([^"]+)"/);
              
              if (filenameMatch && nameMatch) {
                // 这是文件
                const fieldName = nameMatch[1];
                const filename = filenameMatch[1];
                const contentTypeIndex = lines.findIndex(line => line.includes('Content-Type'));
                const dataStartIndex = contentTypeIndex >= 0 ? contentTypeIndex + 2 : 2;
                
                // 提取文件数据
                const fileDataLines = lines.slice(dataStartIndex, -1);
                const fileData = fileDataLines.join('\r\n');
                const buffer = Buffer.from(fileData, 'binary');
                
                // 生成唯一文件名
                const timestamp = Date.now();
                const ext = path.extname(filename);
                const basename = path.basename(filename, ext);
                const newFilename = `${timestamp}-${basename}${ext}`;
                const filepath = path.join(uploadDir, newFilename);
                
                // 保存文件
                fs.writeFileSync(filepath, buffer);
                
                files.push({
                  fieldname: fieldName,
                  originalname: filename,
                  filename: newFilename,
                  path: filepath,
                  size: buffer.length,
                  mimetype: lines.find(line => line.includes('Content-Type'))?.split(': ')[1] || 'application/octet-stream'
                });
              } else if (nameMatch) {
                // 这是普通字段
                const fieldName = nameMatch[1];
                const dataStartIndex = 2;
                const fieldValue = lines.slice(dataStartIndex, -1).join('\r\n').trim();
                fields[fieldName] = fieldValue;
              }
            }
          }
        }
        
        resolve({ fields, files });
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

// 设置路由来处理多文件上传
app.post('/upload', async (req, res) => {
  try {
    const { fields, files } = await parseMultipartData(req);
    
    res.send({
      message: 'Files uploaded successfully',
      files: files,
      fields: fields
    });
  } catch (error: any) {
    res.status(500).send({
      message: 'File upload failed',
      error: error.toString(),
    });
  }
});

// 设置服务器端口
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});