import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ObjectSchema } from "joi";

export const validateBody =
  (schema: ObjectSchema): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      res.status(400).json({ success: false, message: "Validation failed", details });
      return;
    }
    req.body = value;
    next();
  };
