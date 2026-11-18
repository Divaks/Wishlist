import { PartnerService } from '../services/partner.service';
import { PartnerRepository } from '../repositories/partner.repository';
import { UserRepository } from '../repositories/user.repository';

jest.mock('../repositories/partner.repository');
jest.mock('../repositories/user.repository');

describe('PartnerService (Зв’язок між партнерами та групами)', () => {
  let partnerService: PartnerService;
  let partnerRepository: jest.Mocked<PartnerRepository>;
  let userRepository: jest.Mocked<UserRepository>;

  const userAId = 'user-a';
  const userBId = 'user-b';

  beforeEach(() => {
    jest.clearAllMocks();
    partnerRepository = new PartnerRepository() as jest.Mocked<PartnerRepository>;
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    partnerService = new PartnerService(partnerRepository, userRepository);
  });

  describe('connectPartner', () => {
    it('має успішно створити зв’язок між двома користувачами', async () => {
      userRepository.findById.mockResolvedValue({ id: userBId, email: 'b@example.com' } as any);
      partnerRepository.areConnected.mockResolvedValue(false);
      const connection = { id: 'conn-1', userOneId: userAId, userTwoId: userBId, status: 'CONNECTED' };
      partnerRepository.createConnection.mockResolvedValue(connection as any);

      const result = await partnerService.connectPartner(userAId, userBId);

      expect(partnerRepository.createConnection).toHaveBeenCalledWith(userAId, userBId);
      expect(result).toEqual(connection);
    });

    it('має заборонити створювати зв’язок із самим собою', async () => {
      await expect(
        partnerService.connectPartner(userAId, userAId)
      ).rejects.toThrow(/yourself|із самим собою/i);
      expect(partnerRepository.createConnection).not.toHaveBeenCalled();
    });

    it('має викинути 404, якщо цільового партнера не існує', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        partnerService.connectPartner(userAId, 'unknown-user')
      ).rejects.toThrow(/not found|не знайдено/i);
    });

    it('має викинути 409 (Conflict), якщо користувачі вже пов’язані', async () => {
      userRepository.findById.mockResolvedValue({ id: userBId } as any);
      partnerRepository.areConnected.mockResolvedValue(true);

      await expect(
        partnerService.connectPartner(userAId, userBId)
      ).rejects.toThrow(/already connected|вже пов’язані/i);
      expect(partnerRepository.createConnection).not.toHaveBeenCalled();
    });
  });

  describe('disconnectPartner', () => {
    it('має успішно розірвати зв’язок між партнерами', async () => {
      partnerRepository.areConnected.mockResolvedValue(true);
      partnerRepository.deleteConnection.mockResolvedValue(true);

      await partnerService.disconnectPartner(userAId, userBId);

      expect(partnerRepository.deleteConnection).toHaveBeenCalledWith(userAId, userBId);
    });

    it('має викинути 404, якщо зв’язку між користувачами не існує', async () => {
      partnerRepository.areConnected.mockResolvedValue(false);

      await expect(
        partnerService.disconnectPartner(userAId, userBId)
      ).rejects.toThrow(/not found|не знайдено/i);
      expect(partnerRepository.deleteConnection).not.toHaveBeenCalled();
    });
  });
});
