import { RequestUser } from '../interfaces/user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};