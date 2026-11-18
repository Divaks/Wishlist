import { Request, Response, NextFunction } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { PartnerService } from '../services/partner.service';

jest.mock('../services/partner.service');

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

describe('PartnerController', () => {
  let partnerController: PartnerController;
  let partnerService: jest.Mocked<PartnerService>;
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    partnerService = new PartnerService({} as any, {} as any) as jest.Mocked<PartnerService>;
    partnerController = new PartnerController(partnerService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('POST /partners/connect', () => {
    it('має повернути 201 при успішному підключенні партнера', async () => {
      req = {
        user: { id: 'user-a', email: 'a@example.com' },
        body: { partnerId: 'user-b' },
      };
      const connection = { id: 'conn-1', userOneId: 'user-a', userTwoId: 'user-b' };
      partnerService.connectPartner.mockResolvedValue(connection as any);

      await partnerController.connect(req as AuthRequest, res as Response, next);

      expect(partnerService.connectPartner).toHaveBeenCalledWith('user-a', 'user-b');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(connection);
    });

    it('має повернути 400, якщо partnerId не передано', async () => {
      req = {
        user: { id: 'user-a', email: 'a@example.com' },
        body: {},
      };

      await partnerController.connect(req as AuthRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(partnerService.connectPartner).not.toHaveBeenCalled();
    });

    it('має передати помилку 409 у next(), якщо зв’язок вже існує', async () => {
      req = {
        user: { id: 'user-a', email: 'a@example.com' },
        body: { partnerId: 'user-b' },
      };
      const conflictError = Object.assign(new Error('Already connected'), { statusCode: 409 });
      partnerService.connectPartner.mockRejectedValue(conflictError);

      await partnerController.connect(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(conflictError);
    });
  });

  describe('DELETE /partners/:partnerId', () => {
    it('має повернути 204 при успішному видаленні зв’язку', async () => {
      req = {
        user: { id: 'user-a', email: 'a@example.com' },
        params: { partnerId: 'user-b' },
      };
      partnerService.disconnectPartner.mockResolvedValue(undefined);

      await partnerController.disconnect(req as AuthRequest, res as Response, next);

      expect(partnerService.disconnectPartner).toHaveBeenCalledWith('user-a', 'user-b');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
