import "express";

declare global {
  namespace Express {
    interface Request {
      key?: Buffer;
    }
  }
}
