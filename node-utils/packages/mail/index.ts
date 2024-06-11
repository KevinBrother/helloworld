// 引入 nodemailer
import nodemailer from "nodemailer";

// 配置发送者的邮箱服务器和登录信息 创建一个SMTP客户端配置 
var config = {
  host: "smtp.qq.com", //网易163邮箱 smtp.163.com
  port: 465, //网易邮箱端口 25
  secure: true, //使用SSL加密
  auth: {
    user: "1301239018@qq.com", //邮箱账号
    pass: "rspzohgzdvndhaea", //邮箱的授权码
  },
};

// 创建一个SMTP客户端对象
var transporter = nodemailer.createTransport(config);

// 发送邮件
function send(mail: nodemailer.SendMailOptions) {
  transporter.sendMail(mail, function (error, info) {
    if (error) {
      return console.log(error);
    }
    transporter.close();
    console.log("mail sent:", info.response);
  });
}

// 创建一个邮件对象
var mail: nodemailer.SendMailOptions = {
  // 发件人
  from: "1301239018@qq.com",
  // 主题
  subject: "注册",
  // 收件人
  to: "1299178488@qq.com>",
  // 邮件内容，HTML格式
  text: "点击激活：xxx", //可以是链接，也可以是验证码
};
send(mail);
