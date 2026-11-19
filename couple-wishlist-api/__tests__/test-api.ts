const BASE_URL = process.env.API_URL || "http://localhost:3000";

// Кольори для зручного виводу в консоль
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

async function request(
  method: string,
  path: string,
  token?: string,
  body?: Record<string, any>,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    console.log(`${GREEN}✔ PASS:${RESET} ${message}`);
  } else {
    console.error(`${RED}✘ FAIL:${RESET} ${message}`);
    if (details !== undefined) {
      console.error("  Деталі відповіді:", JSON.stringify(details, null, 2));
    }
    process.exit(1);
  }
}

async function runE2ETests() {
  console.log(
    `${CYAN}🚀 Запуск автоматичного тестування API (${BASE_URL})...${RESET}\n`,
  );

  const timestamp = Date.now();
  const userA = {
    email: `user_a_${timestamp}@test.com`,
    password: "Password123!",
    name: "Dmytro",
  };
  const userB = {
    email: `user_b_${timestamp}@test.com`,
    password: "Password123!",
    name: "Olena",
  };

  // --- 1. РЕЄСТРАЦІЯ ТА ЛОГІН ---
  console.log(`${CYAN}[1] Тестування Auth (Register & Login)${RESET}`);

  const regA = await request("POST", "/auth/register", undefined, userA);
  assert(
    regA.status === 201 || regA.status === 200,
    "Реєстрація Користувача А",
    regA,
  );

  const regB = await request("POST", "/auth/register", undefined, userB);
  assert(
    regB.status === 201 || regB.status === 200,
    "Реєстрація Користувача Б",
    regB,
  );

  const loginA = await request("POST", "/auth/login", undefined, {
    email: userA.email,
    password: userA.password,
  });
  const tokenA = loginA.data?.accessToken || loginA.data?.access_token;
  assert(
    (loginA.status === 200 || loginA.status === 201) && Boolean(tokenA),
    "Логін Користувача А та отримання JWT",
    loginA,
  );

  const loginB = await request("POST", "/auth/login", undefined, {
    email: userB.email,
    password: userB.password,
  });
  const tokenB = loginB.data?.accessToken || loginB.data?.access_token;
  assert(
    (loginB.status === 200 || loginB.status === 201) && Boolean(tokenB),
    "Логін Користувача Б та отримання JWT",
    loginB,
  );

  // Перевірка 401 при невірному паролі
  const badLogin = await request("POST", "/auth/login", undefined, {
    email: userA.email,
    password: "WrongPassword!",
  });
  assert(
    badLogin.status === 401,
    "Відхилення невірного пароля (401)",
    badLogin,
  );

  // --- 2. ПРОФІЛЬ ТА ЗВ'ЯЗОК ПАРТНЕРІВ ---
  console.log(`\n${CYAN}[2] Тестування Users & Partner Connection${RESET}`);

  const profileA = await request("GET", "/users/profile", tokenA);
  assert(
    profileA.status === 200 && profileA.data?.email === userA.email,
    "Отримання профілю Користувача А",
    profileA,
  );

  const genCode = await request("POST", "/users/generate-code", tokenA);
  const inviteCode = genCode.data?.inviteCode;
  assert(
    (genCode.status === 201 || genCode.status === 200) && Boolean(inviteCode),
    `Генерація інвайт-коду (${inviteCode})`,
    genCode,
  );

  const connectRes = await request("POST", "/users/connect", tokenB, {
    code: inviteCode,
  });
  assert(
    connectRes.status === 201 || connectRes.status === 200,
    "Підключення Користувача Б до Користувача А за кодом",
    connectRes,
  );

  // --- 3. WISHLIST CRUD + БРОНЮВАННЯ ---
  console.log(
    `\n${CYAN}[3] Тестування Wishlist (CRUD + Partner View + Reserve)${RESET}`,
  );

  const createWish = await request("POST", "/wishlist", tokenA, {
    title: "Навушники Sony WH-1000XM5",
    description: "Чорні",
    price: 12500,
    url: "https://example.com/sony",
  });
  const wishId = createWish.data?.id;
  assert(
    createWish.status === 201 && Boolean(wishId),
    `Створення бажання Користувачем А (ID: ${wishId})`,
    createWish,
  );

  const myWishes = await request("GET", "/wishlist", tokenA);
  assert(
    myWishes.status === 200 &&
      Array.isArray(myWishes.data) &&
      myWishes.data.some((w: any) => w.id === wishId),
    "Перегляд власного списку бажань Користувачем А",
    myWishes,
  );

  // Користувач Б дивиться вішліст партнера А
  const partnerWishes = await request("GET", "/wishlist/partner", tokenB);
  assert(
    partnerWishes.status === 200 &&
      Array.isArray(partnerWishes.data) &&
      partnerWishes.data.some((w: any) => w.id === wishId),
    "Перегляд вішліста партнера Користувачем Б",
    partnerWishes,
  );

  // Негативний тест: Користувач Б намагається змінити чуже бажання (PATCH)
  const hackPatch = await request("PATCH", `/wishlist/${wishId}`, tokenB, {
    title: "Зламано",
  });
  assert(
    hackPatch.status === 403 || hackPatch.status === 404,
    "Заборона редагування чужого бажання (403/404)",
    hackPatch,
  );

  // Власник А редагує своє бажання (PATCH)
  const patchWish = await request("PATCH", `/wishlist/${wishId}`, tokenA, {
    price: 11900,
  });
  assert(
    patchWish.status === 200 && Number(patchWish.data?.price) === 11900,
    "Оновлення ціни бажання власником (PATCH)",
    patchWish,
  );

  // Партнер Б бронює бажання
  const reserveWish = await request(
    "POST",
    `/wishlist/${wishId}/reserve`,
    tokenB,
  );
  assert(
    reserveWish.status === 201 || reserveWish.status === 200,
    "Бронювання бажання партнером (POST /reserve)",
    reserveWish,
  );

  // Партнер Б знімає бронь
  const unreserveWish = await request(
    "DELETE",
    `/wishlist/${wishId}/reserve`,
    tokenB,
  );
  assert(
    unreserveWish.status === 204 || unreserveWish.status === 200,
    "Зняття броні партнером (DELETE /reserve)",
    unreserveWish,
  );

  // --- 4. ГРУПИ (GROUPS) ---
  console.log(`\n${CYAN}[4] Тестування Groups${RESET}`);

  const createGroup = await request("POST", "/groups", tokenA, {
    name: "Новий Рік 2027",
    description: "Спільні бажання друзів",
  });
  const groupId = createGroup.data?.id;
  assert(
    createGroup.status === 201 && Boolean(groupId),
    `Створення групи Користувачем А (ID: ${groupId})`,
    createGroup,
  );

  const inviteMember = await request(
    "POST",
    `/groups/${groupId}/members`,
    tokenA,
    {
      email: userB.email,
    },
  );
  assert(
    inviteMember.status === 201 || inviteMember.status === 200,
    "Додавання Користувача Б у групу",
    inviteMember,
  );

  const groupWishes = await request("GET", `/groups/${groupId}/wishes`, tokenB);
  assert(
    groupWishes.status === 200 && Array.isArray(groupWishes.data),
    "Перегляд бажань учасників групи Користувачем Б",
    groupWishes,
  );

  // --- 5. ОЧИЩЕННЯ (DELETE) ---
  console.log(`\n${CYAN}[5] Тестування видалення (Cleanup)${RESET}`);

  const deleteWish = await request("DELETE", `/wishlist/${wishId}`, tokenA);
  assert(
    deleteWish.status === 200 || deleteWish.status === 204,
    "Видалення бажання власником (DELETE)",
    deleteWish,
  );

  const deleteGroup = await request("DELETE", `/groups/${groupId}`, tokenA);
  assert(
    deleteGroup.status === 204 || deleteGroup.status === 200,
    "Видалення групи власником (DELETE)",
    deleteGroup,
  );

  console.log(
    `\n${GREEN}УСІ ТЕСТИ ПРОЙДЕНО УСПІШНО! Бекенд повністю працездатний.${RESET}`,
  );
}

runE2ETests().catch((err) => {
  console.error(`${RED}Критична помилка під час запуску тестів:${RESET}`, err);
  process.exit(1);
});
