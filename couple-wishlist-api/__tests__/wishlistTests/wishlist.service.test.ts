import { WishlistService } from '../services/wishlist.service';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { PartnerRepository } from '../repositories/partner.repository';

jest.mock('../repositories/wishlist.repository');
jest.mock('../repositories/partner.repository');

describe('WishlistService', () => {
  let wishlistService: WishlistService;
  let wishlistRepository: jest.Mocked<WishlistRepository>;
  let partnerRepository: jest.Mocked<PartnerRepository>;

  const userAId = 'user-a-id';
  const userBId = 'user-b-id';
  const strangerId = 'user-stranger-id';

  const mockWish = {
    id: 'wish-1',
    title: 'Навушники Sony WH-1000XM5',
    description: 'Чорного кольору',
    price: 12000,
    link: 'https://example.com/sony',
    userId: userAId,
    isReserved: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    wishlistRepository = new WishlistRepository() as jest.Mocked<WishlistRepository>;
    partnerRepository = new PartnerRepository() as jest.Mocked<PartnerRepository>;
    wishlistService = new WishlistService(wishlistRepository, partnerRepository);
  });

  describe('createWish', () => {
    it('має створити нове бажання з коректним userId / creatorId', async () => {
      const dto = { title: mockWish.title, description: mockWish.description, price: mockWish.price };
      wishlistRepository.create.mockResolvedValue(mockWish);

      const result = await wishlistService.createWish(userAId, dto);

      expect(wishlistRepository.create).toHaveBeenCalledWith({
        ...dto,
        userId: userAId,
      });
      expect(result).toEqual(mockWish);
    });

    it('має викинути помилку валідації, якщо назва бажання порожня', async () => {
      await expect(
        wishlistService.createWish(userAId, { title: '   ', price: 100 })
      ).rejects.toThrow(/title|назва/i);
      expect(wishlistRepository.create).not.toHaveBeenCalled();
    });

    it('має викинути помилку, якщо ціна від’ємна', async () => {
      await expect(
        wishlistService.createWish(userAId, { title: 'Книга', price: -50 })
      ).rejects.toThrow(/price|ціна/i);
      expect(wishlistRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserWishes & getPartnerOrGroupWishes', () => {
    it('має повернути список власних бажань користувача', async () => {
      wishlistRepository.findByUserId.mockResolvedValue([mockWish]);

      const result = await wishlistService.getMyWishes(userAId);

      expect(wishlistRepository.findByUserId).toHaveBeenCalledWith(userAId);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userAId);
    });

    it('має дозволити перегляд бажань партнера / учасника тієї ж групи', async () => {
      partnerRepository.areConnected.mockResolvedValue(true);
      wishlistRepository.findByUserId.mockResolvedValue([mockWish]);

      const result = await wishlistService.getPartnerWishes(userBId, userAId);

      expect(partnerRepository.areConnected).toHaveBeenCalledWith(userBId, userAId);
      expect(wishlistRepository.findByUserId).toHaveBeenCalledWith(userAId);
      expect(result).toEqual([mockWish]);
    });

    it('має викинути помилку 403 (Forbidden), якщо користувачі не є партнерами і не в одній групі', async () => {
      partnerRepository.areConnected.mockResolvedValue(false);

      await expect(
        wishlistService.getPartnerWishes(strangerId, userAId)
      ).rejects.toThrow(/forbidden|доступ заборонено/i);
      expect(wishlistRepository.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe('updateWish (PATCH)', () => {
    it('має успішно оновити бажання, якщо запит робить його власник', async () => {
      const updateDto = { title: 'Оновлена назва', price: 11500 };
      const updatedWish = { ...mockWish, ...updateDto };

      wishlistRepository.findById.mockResolvedValue(mockWish);
      wishlistRepository.update.mockResolvedValue(updatedWish);

      const result = await wishlistService.updateWish(userAId, mockWish.id, updateDto);

      expect(wishlistRepository.findById).toHaveBeenCalledWith(mockWish.id);
      expect(wishlistRepository.update).toHaveBeenCalledWith(mockWish.id, updateDto);
      expect(result.title).toBe('Оновлена назва');
      expect(result.price).toBe(11500);
    });

    it('має викинути помилку 404 (Not Found), якщо бажання не існує', async () => {
      wishlistRepository.findById.mockResolvedValue(null);

      await expect(
        wishlistService.updateWish(userAId, 'non-existent-id', { title: 'New' })
      ).rejects.toThrow(/not found|не знайдено/i);
      expect(wishlistRepository.update).not.toHaveBeenCalled();
    });

    it('має викинути помилку 403 (Forbidden), якщо інший користувач намагається змінити чуже бажання', async () => {
      wishlistRepository.findById.mockResolvedValue(mockWish);

      await expect(
        wishlistService.updateWish(userBId, mockWish.id, { title: 'Hacked title' })
      ).rejects.toThrow(/forbidden|немає прав/i);
      expect(wishlistRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteWish (DELETE)', () => {
    it('має успішно видалити бажання, якщо запит робить власник', async () => {
      wishlistRepository.findById.mockResolvedValue(mockWish);
      wishlistRepository.delete.mockResolvedValue(true);

      await wishlistService.deleteWish(userAId, mockWish.id);

      expect(wishlistRepository.delete).toHaveBeenCalledWith(mockWish.id);
    });

    it('має викинути помилку 404 (Not Found), якщо бажання для видалення не існує', async () => {
      wishlistRepository.findById.mockResolvedValue(null);

      await expect(
        wishlistService.deleteWish(userAId, 'non-existent-id')
      ).rejects.toThrow(/not found|не знайдено/i);
      expect(wishlistRepository.delete).not.toHaveBeenCalled();
    });

    it('має викинути помилку 403 (Forbidden), якщо інший користувач намагається видалити чуже бажання', async () => {
      wishlistRepository.findById.mockResolvedValue(mockWish);

      await expect(
        wishlistService.deleteWish(userBId, mockWish.id)
      ).rejects.toThrow(/forbidden|немає прав/i);
      expect(wishlistRepository.delete).not.toHaveBeenCalled();
    });
  });
});
