import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;

  router.get('/', controller.home.index);
  router.get('/homeTwo', controller.home.homeTwo);
  router.get('/second', controller.second.index);
  router.get('/second/homeTwo', controller.second.homeTwo);
  router.get('/news', controller.news.list);
};
