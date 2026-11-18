import { Request, Response, NextFunction } from 'express';
import {AuthController} from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';

jest.mock('../../src/auth/auth.service');

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService({} as any) as jest.Mocked<AuthService>;
    authController = new AuthController(authService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('POST /register', () => {
    it('має повернути 201 та дані користувача з токеном при успішній реєстрації', async () => {
      req = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Olena',
        },
      };
      const serviceResponse = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Olena' },
        accessToken: 'jwt_token',
      };
      authService.register.mockResolvedValue(serviceResponse);

      await authController.register(req as Request, res as Response, next);

      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
    });

    it('має повернути 400, якщо відсутні обов’язкові поля (email або password)', async () => {
      req = { body: { email: 'test@example.com' } };

      await authController.register(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('має передати помилку 409 (Conflict) у next(), якщо email вже зайнятий', async () => {
      req = {
        body: { email: 'existing@example.com', password: 'Password123!', name: 'Olena' },
      };
      const conflictError = Object.assign(new Error('User already exists'), { statusCode: 409 });
      authService.register.mockRejectedValue(conflictError);

      await authController.register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(conflictError);
    });
  });

  describe('POST /login', () => {
    it('має повернути 200 та токен при успішному вході', async () => {
      req = {
        body: { email: 'test@example.com', password: 'Password123!' },
      };
      const serviceResponse = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Olena' },
        accessToken: 'jwt_token',
      };
      authService.login.mockResolvedValue(serviceResponse);

      await authController.login(req as Request, res as Response, next);

      expect(authService.login).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
    });

    it('має передати помилку 401 (Unauthorized) при невірних облікових даних', async () => {
      req = {
        body: { email: 'test@example.com', password: 'WrongPassword' },
      };
      const authError = Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
      authService.login.mockRejectedValue(authError);

      await authController.login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(authError);
    });

    it('має повернути 400 при порожньому тілі запиту', async () => {
      req = { body: {} };

      await authController.login(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });
});
