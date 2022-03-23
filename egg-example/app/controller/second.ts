import { Controller } from 'egg';

export default class HomeController extends Controller {
  public async index() {
    const { ctx } = this;
    ctx.body = await ctx.service.test.sayHi('second');
  }

  public async homeTwo() {
    const { ctx } = this;
    ctx.body = await ctx.service.test.sayHi('second two');
  }
}
