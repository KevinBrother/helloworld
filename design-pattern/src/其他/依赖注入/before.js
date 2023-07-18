class EmailService {
  sendEmail(user, message) {
    console.log('this.sendEmail');
  }
}

class UserService {
  constructor() {
    this.emailService = new EmailService();
  }

  createUser(user) {
    this.emailService.sendEmail(user, 'sucess');
  }
}

// tip 问题
// 如果我们想要改变 EmailService 的实现，例如更换邮件发送服务，我们必须修改 UserService 的代码。
// 在单元测试 UserService 时，我们无法用一个模拟的 EmailService 替换真实的 EmailService，这使得测试变得困难。
