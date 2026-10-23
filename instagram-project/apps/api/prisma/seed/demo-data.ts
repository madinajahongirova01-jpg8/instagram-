export const DEMO_EMAIL_DOMAIN = 'demo.insta.local';
export const DEMO_PASSWORD = 'Demo12345';
export const TEST_USERNAMES = ['pwcheck_madina', 'pwcheck_zarina'];

export interface DemoUser {
  username: string;
  fullName: string;
  bio: string;
  website?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  colors: [string, string];
}

export const DEMO_USERS: DemoUser[] = [
  {
    username: 'aziza.dushanbe',
    fullName: 'Aziza Rahimova',
    bio: 'Dushanbe 🇹🇯 · фотограф · закаты над Варзобом',
    isVerified: true,
    colors: ['#f58529', '#dd2a7b'],
  },
  {
    username: 'farrukh.travel',
    fullName: 'Farrukh Nazarov',
    bio: 'Путешествую по Таджикистану ⛰️ Pamir · Fann · Iskanderkul',
    website: 'https://example.com/farrukh',
    colors: ['#4f5bd5', '#962fbf'],
  },
  {
    username: 'nilufar.art',
    fullName: 'Nilufar Saidova',
    bio: 'Художница из Душанбе 🎨 сюзане и акварель',
    colors: ['#feda75', '#fa7e1e'],
  },
  {
    username: 'rustam.pamir',
    fullName: 'Rustam Davlatov',
    bio: 'Хорог → Душанбе. Горы, чай и хорошая компания',
    colors: ['#22c55e', '#0ea5e9'],
  },
  {
    username: 'malika.private',
    fullName: 'Malika Karimova',
    bio: 'Закрытый аккаунт 🔒 только для друзей',
    isPrivate: true,
    colors: ['#a855f7', '#ec4899'],
  },
  {
    username: 'dilshod.food',
    fullName: 'Dilshod Umarov',
    bio: 'Плов, самбуса и шашлык из Душанбе 🍽️',
    colors: ['#ef4444', '#f59e0b'],
  },
];

export const POST_CAPTIONS = [
  'Вечер над Душанбе 🌅 #Dushanbe #Tajikistan #sunset',
  'Утро в горах Фанских 🏔️ #FannMountains #Tajikistan #travel',
  'Искандеркуль — самое голубое озеро 💙 #Iskanderkul #nature #travel',
  'Прогулка по проспекту Рудаки #Dushanbe #city',
  'Памирский тракт, день третий 🚙 #Pamir #roadtrip #Tajikistan',
  'Сюзане ручной работы 🎨 #art #handmade #Dushanbe',
  'Лучший плов в городе 🍚 #food #plov #Dushanbe',
  'Чайхана и друзья ☕ #friends #Tajikistan',
  'Зелёный базар с утра 🍑 #market #Dushanbe',
  'Ночные огни у Флагштока ✨ #Dushanbe #night',
];

export const POST_LOCATIONS = ['Dushanbe, Tajikistan', 'Fann Mountains', 'Iskanderkul', 'Khorog, Pamir', null];

export const POST_SIZES = [1, 3, 1, 2, 5, 1, 4, 2, 1, 3];

export const REEL_CAPTIONS = [
  'Душанбе в движении 🎬 #Dushanbe #Tajikistan #travel',
  'Дорога в горы ⛰️ #Pamir #Tajikistan #travel #reels',
  'Один день в Таджикистане #Tajikistan #travel #vlog',
  'Красота природы 🌿 #nature #Tajikistan #travel',
  'Вечерний город ✨ #Dushanbe #citylights #travel',
  'Горное озеро 💙 #Iskanderkul #Tajikistan #travel',
];

export const STORY_CAPTIONS = ['Доброе утро, Душанбе ☀️', 'Сегодня в горах ⛰️', 'Новый рисунок скоро 🎨', 'Обед 🍽️'];

export const COMMENTS = [
  'Как красиво! 😍',
  'Очень круто 🔥',
  'Хочу туда!',
  'Зебо! 👏',
  'Лучшее фото дня',
  'Где это? Хочу поехать',
  'Ба ман маъқул шуд ❤️',
  'Super 🙌',
];
