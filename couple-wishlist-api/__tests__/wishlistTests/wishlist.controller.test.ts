import { Request, Response, NextFunction } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { WishlistService } from '../services/wishlist.service';

jest.mock('../services/wishlist.service');

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

describe('WishlistController', () => {
  let wishlistController: WishlistController;
  let wishlistService: jest.Mocked<WishlistService>;
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    wishlistService = new WishlistService({} as any, {} as any) as jest.Mocked<WishlistService>;
    wishlistController = new WishlistController(wishlistService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('POST /wishes', () => {
    it('має повернути 201 та створене бажання', async () => {
      req = {
        user: { id: 'user-1', email: 'a@example.com' },
        body: { title: 'Новий ноутбук', price: 45000 },
      };
      const createdWish = { id: 'wish-1', ...req.body, userId: 'user-1' };
      wishlistService.createWish.mockResolvedValue(createdWish);

      await wishlistController.create(req as AuthRequest, res as Response, next);

      expect(wishlistService.createWish).toHaveBeenCalledWith('user-1', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdWish);
    });

    it('має повернути 401, якщо користувач не авторизований', async () => {
      req = { user: undefined, body: { title: 'Новий ноутбук' } };

      await wishlistController.create(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(wishlistService.createWish).not.toHaveBeenCalled();
    });
  });

  describe('GET /wishes', () => {
    it('має повернути 200 та список власних бажань', async () => {
      req = { user: { id: 'user-1', email: 'a@example.com' } };
      const wishes = [{ id: 'wish-1', title: 'Книга', userId: 'user-1' }];
      wishlistService.getMyWishes.mockResolvedValue(wishes as any);

      await wishlistController.getMyWishes(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(wishes);
    });

    it('має повернути 200 та бажання партнера / учасника групи', async () => {
      req = {
        user: { id: 'user-2', email: 'b@example.com' },
        params: { partnerId: 'user-1' },
      };
      const partnerWishes = [{ id: 'wish-1', title: 'Книга', userId: 'user-1' }];
      wishlistService.getPartnerWishes.mockResolvedValue(partnerWishes as any);

      await wishlistController.getPartnerWishes(req as AuthRequest, res as Response, next);

      expect(wishlistService.getPartnerWishes).toHaveBeenCalledWith('user-2', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(partnerWishes);
    });
  });

  describe('PATCH /wishes/:id', () => {
    it('має повернути 200 та оновлене бажання', async () => {
      req = {
        user: { id: 'user-1', email: 'a@example.com' },
        params: { id: 'wish-1' },
        body: { title: 'Оновлена книга' },
      };
      const updated = { id: 'wish-1', title: 'Оновлена книга', userId: 'user-1' };
      wishlistService.updateWish.mockResolvedValue(updated as any);

      await wishlistController.update(req as AuthRequest, res as Response, next);

      expect(wishlistService.updateWish).toHaveBeenCalledWith('user-1', 'wish-1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('має передати помилку 403 у next(), якщо користувач не є власником бажання', async () => {
      req = {
        user: { id: 'user-2', email: 'b@example.com' },
        params: { id: 'wish-1' },
        body: { title: 'Спроба зламу' },
      };
      const forbiddenError = Object.assign(new Error('Forbidden'), { statusCode: 403 });
      wishlistService.updateWish.mockRejectedValue(forbiddenError);

      await wishlistController.update(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(forbiddenError);
    });
  });

  describe('DELETE /wishes/:id', () => {
    it('має повернути 204 (No Content) після успішного видалення', async () => {
      req = {
        user: { id: 'user-1', email: 'a@example.com' },
        params: { id: 'wish-1' },
      };
      wishlistService.deleteWish.mockResolvedValue(undefined);

      await wishlistController.delete(req as AuthRequest, res as Response, next);

      expect(wishlistService.deleteWish).toHaveBeenCalledWith('user-1', 'wish-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('має передати помилку 404 у next(), якщо бажання не знайдено', async () => {
      req = {
        user: { id: 'user-1', email: 'a@example.com' },
        params: { id: 'missing-wish' },
      };
      const notFoundError = Object.assign(new Error('Wish not found'), { statusCode: 404 });
      wishlistService.deleteWish.mockRejectedValue(notFoundError);

      await wishlistController.delete(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });
  });
});
