/** Minimal jest-based stand-ins for TypeORM repositories / query builders. */
export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((entity: object) => ({ ...entity })),
  save: jest.fn((entity: object) => Promise.resolve(entity)),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn((entity: object) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn(),
});

export type MockRepository = ReturnType<typeof createMockRepository>;

/** Chainable query builder; every builder method returns itself. */
export const createMockQueryBuilder = (result: unknown[] = []) => {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ["innerJoin", "leftJoinAndSelect", "where", "orderBy"]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(result);
  return qb;
};
