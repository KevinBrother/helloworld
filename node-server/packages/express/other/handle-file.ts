import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const app = express();

// 跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 配置 multer 来指定上传文件的存储位置和文件命名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 上传文件存放的目录
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // 给文件重命名，避免文件名冲突
  }
});

// 初始化 multer 并指定存储策略
const upload = multer({ storage: storage });

// 创建上传目录
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

// 计算文件MD5
const calculateFileMD5 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// 处理批量文件上传
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const clientChecksums = JSON.parse(req.body.checksums || '[]');
    console.log('req.files', req.files);
    console.log('req.body.checksums', req.body.checksums);
    
    if (!files || files.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No files uploaded',
        data: []
      });
    }

    const results = await Promise.all(
      files.map(async (file, index) => {
        try {
          // 计算服务器端MD5
          const serverChecksum = await calculateFileMD5(file.path);
          const clientChecksum = clientChecksums[index];
          
          // 校验MD5是否一致
          const checksumMatch = serverChecksum === clientChecksum;
          
          if (!checksumMatch) {
            // 如果校验失败，删除文件
            fs.unlinkSync(file.path);
            throw new Error(`Checksum mismatch. Expected: ${clientChecksum}, Got: ${serverChecksum}`);
          }

          return {
            name: file.originalname,
            fileId: file.filename,
            url: `/uploads/${file.filename}`,
            checksum: serverChecksum,
            success: true
          };
        } catch (error: any) {
          return {
            name: file.originalname,
            fileId: '',
            url: '',
            checksum: clientChecksums[index] || '',
            success: false,
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    
    res.send({
      success: successCount === files.length,
      message: `${successCount}/${files.length} files uploaded successfully`,
      data: results
    });

  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: 'File upload failed',
      data: [],
      error: error.toString()
    });
  }
});

// 处理标准化FormData上传
app.post('/upload-formdata', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const fileInfos = JSON.parse(req.body.fileInfos || '[]');
    
    console.log('标准化FormData上传');
    console.log('req.files', files);
    console.log('req.body.fileInfos', fileInfos);
    
    if (!files || files.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No files uploaded',
        data: []
      });
    }

    const results = await Promise.all(
      files.map(async (file, index) => {
        try {
          // 计算服务器端MD5
          const serverChecksum = await calculateFileMD5(file.path);
          const clientFileInfo = fileInfos[index];
          
          // 校验MD5是否一致
          const checksumMatch = serverChecksum === clientFileInfo?.checksum;
          
          if (!checksumMatch) {
            // 如果校验失败，删除文件
            fs.unlinkSync(file.path);
            throw new Error(`Checksum mismatch. Expected: ${clientFileInfo?.checksum}, Got: ${serverChecksum}`);
          }

          return {
            name: file.originalname,
            fileId: file.filename,
            url: `/uploads/${file.filename}`,
            checksum: serverChecksum,
            success: true,
            clientFileInfo: clientFileInfo // 返回客户端的标准化信息
          };
        } catch (error: any) {
          return {
            name: file.originalname,
            fileId: '',
            url: '',
            checksum: fileInfos[index]?.checksum || '',
            success: false,
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    
    res.send({
      success: successCount === files.length,
      message: `标准化FormData上传: ${successCount}/${files.length} files uploaded successfully`,
      data: results
    });

  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: 'StandardFormData upload failed',
      data: [],
      error: error.toString()
    });
  }
});

// 处理JSON方式上传
app.post('/upload-json', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { files } = req.body;
    
    console.log('JSON上传');
    console.log('收到文件数量:', files?.length);
    
    if (!files || files.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No files in request',
        data: []
      });
    }

    const results = await Promise.all(
      files.map(async (fileData: any, index: number) => {
        try {
          // 解码Base64数据
          const buffer = Buffer.from(fileData.data, 'base64');
          
          // 生成文件名
          const timestamp = Date.now();
          const filename = `${timestamp}-${fileData.name}`;
          const filePath = `./uploads/${filename}`;
          
          // 写入文件
          fs.writeFileSync(filePath, buffer);
          
          // 计算服务器端MD5
          const serverChecksum = await calculateFileMD5(filePath);
          
          // 校验MD5
          const checksumMatch = serverChecksum === fileData.checksum;
          
          if (!checksumMatch) {
            // 如果校验失败，删除文件
            fs.unlinkSync(filePath);
            throw new Error(`Checksum mismatch. Expected: ${fileData.checksum}, Got: ${serverChecksum}`);
          }

          return {
            name: fileData.name,
            fileId: filename,
            url: `/uploads/${filename}`,
            checksum: serverChecksum,
            success: true,
            receivedInfo: {
              name: fileData.name,
              size: fileData.size,
              type: fileData.type,
              checksum: fileData.checksum
            }
          };
        } catch (error: any) {
          return {
            name: fileData?.name || 'unknown',
            fileId: '',
            url: '',
            checksum: fileData?.checksum || '',
            success: false,
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    
    res.send({
      success: successCount === files.length,
      message: `JSON上传: ${successCount}/${files.length} files uploaded successfully`,
      data: results
    });

  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: 'JSON upload failed',
      data: [],
      error: error.toString()
    });
  }
});

// 设置服务器端口
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});