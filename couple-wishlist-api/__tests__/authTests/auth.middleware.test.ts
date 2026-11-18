import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

describe('authMiddleware (JWT перевірка)', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('має пропустити запит далі (next) та записати req.user при валідному Bearer токені', () => {
    req = {
      headers: { authorization: 'Bearer valid_jwt_token' },
    };
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1', email: 'a@example.com' });

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid_jwt_token', expect.any(String));
    expect(req.user).toEqual({ id: 'user-1', email: 'a@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('має повернути 401, якщо заголовок Authorization відсутній', () => {
    req = { headers: {} };

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('має повернути 401, якщо формат токена не Bearer', () => {
    req = { headers: { authorization: 'Basic some_credentials' } };

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('має повернути 401, якщо токен невалідний або прострочений', () => {
    req = { headers: { authorization: 'Bearer invalid_token' } };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
