import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { GroupsController } from "../../../src/controllers/groups.controller";
import { GroupsService } from "../../../src/services/groups.service";
import { PaginationDto } from "../../../src/dto/common/pagination.dto";

describe("GroupsController", () => {
  let controller: GroupsController;
  const service = {
    create: jest.fn(),
    findMyGroups: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    inviteMember: jest.fn(),
    removeMember: jest.fn(),
    transferOwnership: jest.fn(),
    getGroupWishes: jest.fn(),
    getMemberWishes: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useValue: service }],
    }).compile();
    controller = module.get(GroupsController);
  });

  const pagination: PaginationDto = { page: 1, limit: 20 };

  it("create", async () => {
    await controller.create("u1", { name: "G" });
    expect(service.create).toHaveBeenCalledWith("u1", { name: "G" });
  });

  it("findMyGroups", async () => {
    await controller.findMyGroups("u1", pagination);
    expect(service.findMyGroups).toHaveBeenCalledWith("u1", pagination);
  });

  it("findOne", async () => {
    await controller.findOne("u1", "g1");
    expect(service.findOne).toHaveBeenCalledWith("u1", "g1");
  });

  it("update", async () => {
    await controller.update("u1", "g1", { name: "N" });
    expect(service.update).toHaveBeenCalledWith("u1", "g1", { name: "N" });
  });

  it("remove", async () => {
    await controller.remove("u1", "g1");
    expect(service.remove).toHaveBeenCalledWith("u1", "g1");
  });

  it("inviteMember passes only the email from the dto", async () => {
    await controller.inviteMember("u1", "g1", { email: "b@c.com" });
    expect(service.inviteMember).toHaveBeenCalledWith("u1", "g1", "b@c.com");
  });

  it("removeMember", async () => {
    await controller.removeMember("u1", "g1", "u2");
    expect(service.removeMember).toHaveBeenCalledWith("u1", "g1", "u2");
  });

  it("transferOwnership", async () => {
    await controller.transferOwnership("u1", "g1", "u2");
    expect(service.transferOwnership).toHaveBeenCalledWith("u1", "g1", "u2");
  });

  it("leaveGroup", async () => {
    await controller.leaveGroup("u1", "g1");
    expect(service.removeMember).toHaveBeenCalledWith("u1", "g1", "u1");
  });

  it("getGroupWishes", async () => {
    await controller.getGroupWishes("u1", "g1", pagination);
    expect(service.getGroupWishes).toHaveBeenCalledWith("u1", "g1", pagination);
  });

  it("getMemberWishes", async () => {
    await controller.getMemberWishes("u1", "g1", "u2", pagination);
    expect(service.getMemberWishes).toHaveBeenCalledWith(
      "u1",
      "g1",
      "u2",
      pagination,
    );
  });

  it("propagates Forbidden errors", async () => {
    service.findOne.mockRejectedValue(new ForbiddenException());
    await expect(controller.findOne("u1", "g1")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
