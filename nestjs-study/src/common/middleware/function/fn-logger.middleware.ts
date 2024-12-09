import { Request, Response, NextFunction } from 'express';

export function fnLogger(req: Request, res: Response, next: NextFunction) {
  console.log(`fn logger Request...`);
  next();
}
