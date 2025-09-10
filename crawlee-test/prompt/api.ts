import { v4 as uuidv4 } from 'uuid';

/**
 * 
 * @param url : 爬取入口 url
 */
function startCrawler(url: string): string {
    const taskId = uuidv4();
    // await 往 爬虫队列中添加一个 job
    return taskId;
}


interface IJob {
    url: string; // 任务对应的 URL
    status: 'pending' | 'in-progress' | 'completed' | 'failed'; // 任务状态
    title: string; // 任务爬取的页面标题
    taskId: string; // 任务 ID
    requestId: string; // 请求 ID
    createdAt: Date; // 任务创建时间
    startedAt?: Date; // 任务开始时间
    completedAt?: Date; // 任务完成时间
    error?: string; // 如果任务失败，记录错误信息
}

interface ITaskStatus {
    totalUrls: number; // 总 URL 数量
    completedCount: number; // 已完成数量
    failedCount: number; // 失败数量
    pendingCount: number; // 待处理数量
    jobs: IJob[]; // 任务列表
}
/**
 * 
 * @param taskId : 任务 ID
 * @returns {ITaskStatus} : 返回任务的当前状态，包括总 URL 数量、已完成数量、失败数量、待处理数量等
 */
function getCrawlerStatus(taskId: string): ITaskStatus {
    
    // const taskStatus = await 获取任务状态
    // return taskStatus;
}



