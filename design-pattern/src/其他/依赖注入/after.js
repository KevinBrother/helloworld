class EmailService {
  sendEmail(user, message) {
    console.log('this.sendEmail');
  }
}

class UserService {
  constructor(emailService) {
    this.emailService = emailService;
  }

  createUser(user) {
    this.emailService.sendEmail(user, 'sucess');
  }
}

// UserService 不再直接实例化 EmailService，而是通过构造函数将其注入。这使得我们可以在运行时动态地更改 EmailService 的实现，而无需修改 UserService 的代码。在测试时，我们可以轻易地将真实的 EmailService 替换为模拟的 EmailService。
