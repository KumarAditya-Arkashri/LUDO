import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const reqId = req.headers['x-request-id'] || crypto.randomUUID();
    req.headers['x-request-id'] = reqId;
    res.setHeader('x-request-id', reqId);
    next();
  }
}
