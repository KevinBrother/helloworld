import { Controller } from 'egg';

export default class NewsController extends Controller {
  public async list() {
    const dataList = {
      list: [
        { id: 1, title: 'this is news 1', url: '/' },
        { id: 2, title: 'this is news 2', url: '/second' },
      ],
    };

    await this.ctx.render('news/list.html', dataList);
  }
}