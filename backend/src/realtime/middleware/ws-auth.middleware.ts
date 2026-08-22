import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

export const WSAuthMiddleware = (): SocketMiddleware => {
  return (client, next) => {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) throw new Error('JWT_ACCESS_SECRET is required');
      const decoded = jwt.verify(token, secret);

      // Inject user into socket for later use in Gateway
      (client as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  };
};
