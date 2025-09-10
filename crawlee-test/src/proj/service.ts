import { IApiRequest } from './api';
import { IRedisQueue } from './store';

export interface IService {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createService(
  param: IApiRequest & { taskId: string }
): IService {
  
    const { url, scrapeOption, taskId } = param;
    

}
