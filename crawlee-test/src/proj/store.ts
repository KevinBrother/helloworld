// redis
export interface IRedisQueue {
  save(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

// MinIO
export interface IMinIO {
  upload(bucket: string, objectName: string, filePath: string): Promise<void>;
  download(bucket: string, objectName: string, destPath: string): Promise<void>;
  delete(bucket: string, objectName: string): Promise<void>;
}

// mysql
export interface IMysql {
  query(sql: string, params?: any[]): Promise<any>;
  insert(table: string, data: Record<string, any>): Promise<void>;
  update(
    table: string,
    data: Record<string, any>,
    where: string,
    params?: any[]
  ): Promise<void>;
  delete(table: string, where: string, params?: any[]): Promise<void>;
}
