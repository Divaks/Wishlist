/** Minimal jest-based stand-ins for TypeORM repositories / query builders. */
export const createMockRepository = () => {
  const transactionManager = {
    getRepository: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    existsBy: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
  };
  return {
    transactionManager,
    manager: {
      transaction: jest.fn(
        (callback: (manager: typeof transactionManager) => Promise<unknown>) =>
          callback(transactionManager),
      ),
    },
    query: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((entity: object) => ({ ...entity })),
    save: jest.fn((entity: object) => Promise.resolve(entity)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn((entity: object) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn(),
  };
};

export type MockRepository = ReturnType<typeof createMockRepository>;

/** Chainable query builder; every builder method returns itself. */
export const createMockQueryBuilder = (result: unknown[] = []) => {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    "innerJoin",
    "leftJoinAndSelect",
    "where",
    "orderBy",
    "addOrderBy",
    "skip",
    "take",
    "getManyAndCount",
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(result);
  qb.getManyAndCount.mockResolvedValue([result, result.length]);
  return qb;
};
