import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = (process.env.API_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const runId = randomUUID();
const password = randomUUID();
const checked = new Set<string>();

type Account = { id: string; email: string; token: string };
type Page<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
type Group = {
  id: string;
  name: string;
  createdById: string;
  members: { userId: string; role: string }[];
};
type Wish = {
  id: string;
  title: string;
  price: number;
  isInCart: boolean;
  isReserved: boolean;
  reservedById: string | null;
  reservedBy: unknown;
};
type Profile = {
  userId: string;
  email: string;
  name: string;
  birthday: string | null;
};

async function request<T = void>(
  method: string,
  path: string,
  expected: number,
  account?: Account,
  body?: object,
  route = path.split("?")[0],
): Promise<T> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(account && { Authorization: `Bearer ${account.token}` }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path} expected ${expected}, got ${response.status}`,
  );
  const key = `${method} ${route}`;
  if (response.ok && !checked.has(key)) {
    checked.add(key);
    console.log(`PASS ${key}`);
  }
  if (expected === 204) {
    assert.equal(await response.text(), "");
    return undefined as T;
  }
  return (await response.json()) as T;
}

const accounts: Account[] = [];
let group: Group | undefined;
let groupOwner: Account | undefined;

async function register(name: string) {
  const email = `smoke-${runId}-${name}@example.org`;
  const credentials = { email, password };
  const created = await request<{
    id: string;
    email: string;
    password?: string;
  }>("POST", "/auth/register", 201, undefined, { ...credentials, name });
  assert.equal(created.email, email);
  assert.equal(created.password, undefined);
  const { accessToken } = await request<{ accessToken: string }>(
    "POST",
    "/auth/login",
    201,
    undefined,
    credentials,
  );
  assert.ok(accessToken);
  const account = { id: created.id, email, token: accessToken };
  accounts.push(account);
  return account;
}

function checkPage<T extends { id: string }>(page: Page<T>, id: string) {
  assert.equal(page.page, 1);
  assert.equal(page.limit, 1);
  assert.equal(page.total, 1);
  assert.equal(page.totalPages, 1);
  assert.deepEqual(
    page.data.map((item) => item.id),
    [id],
  );
}

async function smoke() {
  const health = await request<{ status: string; timestamp: string }>(
    "GET",
    "/health",
    200,
  );
  assert.equal(health.status, "ok");
  assert.ok(Number.isFinite(Date.parse(health.timestamp)));
  await request("GET", "/users/profile", 401);
  const owner = await register("owner");
  const member = await register("member");
  const guest = await register("guest");
  await request("POST", "/auth/login", 401, undefined, {
    email: owner.email,
    password: "wrong-password",
  });
  const profile = await request<Profile>("GET", "/users/profile", 200, owner);
  assert.equal(profile.userId, owner.id);
  await request("PATCH", "/users/profile", 400, owner, {
    birthday: "2026-02-30",
  });
  await request("PATCH", "/users/profile", 200, owner, {
    name: "Smoke owner",
    birthday: "2000-02-29",
  });
  assert.equal(
    (await request<Profile>("GET", "/users/profile", 200, owner)).birthday,
    "2000-02-29",
  );

  group = await request<Group>("POST", "/groups", 201, owner, {
    name: `Smoke ${runId}`,
  });
  groupOwner = owner;
  const groupPath = `/groups/${group.id}`;
  const ownGroups = await request<Group[]>("GET", "/groups", 200, owner);
  assert.deepEqual(
    ownGroups.map((item) => item.id),
    [group.id],
  );
  checkPage(
    await request<Page<Group>>(
      "GET",
      "/groups/paged?page=1&limit=1",
      200,
      owner,
    ),
    group.id,
  );
  assert.equal(
    (
      await request<Group>(
        "GET",
        groupPath,
        200,
        owner,
        undefined,
        "/groups/:id",
      )
    ).createdById,
    owner.id,
  );
  await request("PATCH", groupPath, 400, owner, { name: null }, "/groups/:id");
  const updatedGroup = await request<Group>(
    "PATCH",
    groupPath,
    200,
    owner,
    { name: "Renamed smoke group" },
    "/groups/:id",
  );
  assert.equal(updatedGroup.name, "Renamed smoke group");

  for (const invitee of [member, guest]) {
    const invitation = await request<{ status: string }>(
      "POST",
      groupPath + "/members",
      201,
      owner,
      { email: invitee.email },
      "/groups/:id/members",
    );
    assert.equal(invitation.status, "pending");
    const pending = await request<{ groupId: string }[]>(
      "GET",
      "/groups/invitations",
      200,
      invitee,
    );
    assert.deepEqual(pending, [{ groupId: group.id }]);
    await request(
      "GET",
      groupPath + "/wishes",
      403,
      invitee,
      undefined,
      "/groups/:id/wishes",
    );
    await request(
      "POST",
      groupPath + "/invitations/accept",
      204,
      invitee,
      undefined,
      "/groups/:id/invitations/accept",
    );
    assert.deepEqual(
      await request("GET", "/groups/invitations", 200, invitee),
      [],
    );
  }

  await request("POST", "/wishlist", 400, owner, {
    title: "Invalid price",
    price: 100_000_000,
  });
  const wish = await request<Wish>("POST", "/wishlist", 201, owner, {
    title: "Smoke wish",
    price: 12.5,
    isInCart: true,
  });
  assert.equal(wish.isInCart, true);
  const wishPath = `/wishlist/${wish.id}`;
  await request(
    "PATCH",
    wishPath,
    400,
    owner,
    { price: -100_000_000 },
    "/wishlist/:id",
  );
  assert.deepEqual(
    (await request<Wish[]>("GET", "/wishlist", 200, owner)).map(
      (item) => item.id,
    ),
    [wish.id],
  );
  checkPage(
    await request<Page<Wish>>(
      "GET",
      "/wishlist/paged?page=1&limit=1",
      200,
      owner,
    ),
    wish.id,
  );
  assert.equal(
    (
      await request<Wish>(
        "GET",
        wishPath,
        200,
        owner,
        undefined,
        "/wishlist/:id",
      )
    ).price,
    12.5,
  );
  const edited = await request<Wish>(
    "PATCH",
    wishPath,
    200,
    owner,
    { title: "Edited smoke wish" },
    "/wishlist/:id",
  );
  assert.equal(edited.title, "Edited smoke wish");

  const groupWishes = await request<Wish[]>(
    "GET",
    groupPath + "/wishes",
    200,
    member,
    undefined,
    "/groups/:id/wishes",
  );
  assert.deepEqual(
    groupWishes.map((item) => item.id),
    [wish.id],
  );
  checkPage(
    await request<Page<Wish>>(
      "GET",
      groupPath + "/wishes/paged?limit=1",
      200,
      member,
      undefined,
      "/groups/:id/wishes/paged",
    ),
    wish.id,
  );
  const memberWishes = groupPath + "/wishes/" + owner.id + "?limit=1";
  checkPage(
    await request<Page<Wish>>(
      "GET",
      memberWishes,
      200,
      member,
      undefined,
      "/groups/:id/wishes/:memberId",
    ),
    wish.id,
  );

  const reservation = await request<Wish>(
    "POST",
    wishPath + "/reserve",
    201,
    member,
    undefined,
    "/wishlist/:id/reserve",
  );
  assert.equal(reservation.reservedById, member.id);
  const hidden = await request<Wish>(
    "GET",
    wishPath,
    200,
    owner,
    undefined,
    "/wishlist/:id",
  );
  assert.equal(hidden.isReserved, false);
  assert.equal(hidden.reservedById, null);
  const visible = await request<Page<Wish>>(
    "GET",
    memberWishes,
    200,
    guest,
    undefined,
    "/groups/:id/wishes/:memberId",
  );
  assert.equal(visible.data[0].isReserved, true);
  assert.equal(visible.data[0].reservedBy, null);
  await request(
    "DELETE",
    wishPath + "/reserve",
    204,
    member,
    undefined,
    "/wishlist/:id/reserve",
  );
  const cleared = await request<Page<Wish>>(
    "GET",
    memberWishes,
    200,
    guest,
    undefined,
    "/groups/:id/wishes/:memberId",
  );
  assert.equal(cleared.data[0].isReserved, false);

  await request(
    "DELETE",
    groupPath + "/members/" + guest.id,
    204,
    owner,
    undefined,
    "/groups/:id/members/:targetUserId",
  );
  await request("GET", groupPath, 403, guest, undefined, "/groups/:id");
  await request(
    "POST",
    groupPath + "/members/" + member.id + "/transfer-ownership",
    204,
    owner,
    undefined,
    "/groups/:id/members/:targetUserId/transfer-ownership",
  );
  groupOwner = member;
  assert.equal(
    (
      await request<Group>(
        "GET",
        groupPath,
        200,
        member,
        undefined,
        "/groups/:id",
      )
    ).createdById,
    member.id,
  );
  await request(
    "DELETE",
    groupPath + "/leave",
    204,
    owner,
    undefined,
    "/groups/:id/leave",
  );
  await request("DELETE", wishPath, 204, owner, undefined, "/wishlist/:id");
  await request("GET", wishPath, 404, owner, undefined, "/wishlist/:id");
}

async function main() {
  try {
    await smoke();
  } finally {
    // Continue cleanup after an assertion failure and only touch fixtures created by this run.
    const failures: unknown[] = [];
    if (group && groupOwner) {
      await request(
        "DELETE",
        `/groups/${group.id}`,
        204,
        groupOwner,
        undefined,
        "/groups/:id",
      ).catch((error: unknown) => failures.push(error));
    }
    for (const account of accounts) {
      await request("DELETE", "/users/account", 204, account).catch(
        (error: unknown) => failures.push(error),
      );
    }
    for (const error of failures) console.error("Cleanup failed", error);
    if (failures.length) process.exitCode = 1;
  }
  if (!process.exitCode)
    console.log(`Passed HTTP checks for ${checked.size} routes`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
