# TODO

- 这是两个进程的服务端程序，其中 api 层负责接受请求，创建爬虫任务，查询任务状态
- 爬虫进程负责执行爬虫任务，处理爬取的页面，保存结果

## 使用 PlaywrightCrawler 类实现爬虫功能，并实现任务管理功能

## 主要功能，开始爬虫任务，获取爬虫任务状态

## 一个任务对应一个 作业（job），一个job 对应一个 url。入口 url 应该会产生一个 task 和 一个 job

## 每调用一次 startCrawler 就会创建一个新的 task，需要做好 task 和job 与 url 的管理，方便查询

## 使用文件级别的 RequestQueue

## api 层

- 使用 UUID 生成唯一taskId 和 jobId，
- 使用 express + ts

## worker 层

使用 PlaywrightCrawler 启动爬虫任务，且是 daemon 模式

## tip

 1. 每个job 是独立的，没有 parentJob 的概念，每个job 都属于一个 task
 2. 需要多展示一些一些 getCrawlerStatus 的伪代码，方便我验证你的思路是否正确
 3. storage 的 目录结构描述请求，并增加案例展示
 4. 这是两个进程，server 和 worker 是独立启动，通过 RequestQueue联系。worker 可能还没启动，他会独立启动，会消费 api
  层已经往RQ添加的作业，也可能RQ中没有作业，他会一直等待着api层往RQ添加作业，自己解析到 同域名的标签也会往RQ中添加作业
 5. 日志使用 wiston 库实现
