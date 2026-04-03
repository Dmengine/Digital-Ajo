declare global {
  namespace Express {
    interface Request {
      userId?: string;
      rawBody?: Buffer;
    }
  }
}

export {};
