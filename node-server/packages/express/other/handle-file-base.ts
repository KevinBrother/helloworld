import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();

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
const fs = require('fs');
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

// 设置一个路由来处理文件上传，'file' 是表单中上传文件的字段名
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    res.send({
      message: 'File uploaded successfully',
      file: req.file, // 包含上传文件的信息
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