import { AuthService } from '../services/auth.service';
// Замініть імпорти нижче на реальні моделі / утиліти вашого проєкту
import { UserRepository } from '../repositories/user.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../repositories/user.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService(userRepository);
  });

  describe('register', () => {
    const registerDto = {
      email: 'user@example.com',
      password: 'StrongPassword123!',
      name: 'Dmytro',
    };

    it('має успішно зареєструвати нового користувача та повернути JWT токен', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      userRepository.create.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        password: 'hashed_password',
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');

      const result = await authService.register(registerDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, expect.any(Number));
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        name: registerDto.name,
        password: 'hashed_password',
      });
      expect(result).toEqual({
        user: { id: 'user-1', email: registerDto.email, name: registerDto.name },
        accessToken: 'mock_jwt_token',
      });
    });

    it('має викинути помилку, якщо користувач з таким email вже існує', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: 'Existing User',
        password: 'hashed_password',
      });

      await expect(authService.register(registerDto)).rejects.toThrow(/already exists|вже існує/i);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('має коректно пробросити помилку бази даних при створенні користувача', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      userRepository.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(authService.register(registerDto)).rejects.toThrow('Database connection failed');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'StrongPassword123!',
    };

    const existingUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Dmytro',
      password: 'hashed_password',
    };

    it('має успішно авторизувати користувача та повернути JWT токен', async () => {
      userRepository.findByEmail.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');

      const result = await authService.login(loginDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, existingUser.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: existingUser.id, email: existingUser.email },
        expect.any(String),
        expect.any(Object)
      );
      expect(result.accessToken).toBe('mock_jwt_token');
    });

    it('має викинути помилку 401, якщо користувача не знайдено', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(/invalid credentials|невірний/i);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('має викинути помилку 401, якщо пароль невірний', async () => {
      userRepository.findByEmail.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(/invalid credentials|невірний/i);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('має повернути payload при валідному JWT токені', () => {
      const payload = { userId: 'user-1', email: 'user@example.com' };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const result = authService.verifyToken('valid_token');

      expect(result).toEqual(payload);
    });

    it('має викинути помилку при простроченому або невалідному токені', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => authService.verifyToken('expired_token')).toThrow('jwt expired');
    });
  });
});
