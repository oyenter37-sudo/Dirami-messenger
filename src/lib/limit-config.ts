export const DEFAULT_USER_LIMITS = {
  messagesPerMinute: 12,
  pendingRequests: 3,
  chatRequestsPerHour: 10,
  requestActionsPerMinute: 30,
  reactionsPerMinute: 30,
  chatListReadsPerMinute: 40,
  messageReadsPerMinute: 90,
  searchesPerMinute: 30,
  profileViewsPerMinute: 60,
  profileUpdatesPerHour: 12,
  passwordChangesPerHour: 5,
  nftTransfersPerHour: 20,
  nftMintsPerHour: 100,
} as const;

export type UserLimitKey = keyof typeof DEFAULT_USER_LIMITS;
export type UserLimits = Record<UserLimitKey, number>;

export const USER_LIMIT_DEFINITIONS: Array<{
  key: UserLimitKey;
  label: string;
  shortLabel: string;
  period: "минута" | "час" | "одновременно";
  userVisible: boolean;
  max: number;
}> = [
  {
    key: "messagesPerMinute",
    label: "Сообщения",
    shortLabel: "Сообщений в минуту",
    period: "минута",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "pendingRequests",
    label: "Одновременные исходящие запросы",
    shortLabel: "Активных запросов",
    period: "одновременно",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "chatRequestsPerHour",
    label: "Новые запросы на общение",
    shortLabel: "Запросов в час",
    period: "час",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "requestActionsPerMinute",
    label: "Принятие и отклонение запросов",
    shortLabel: "Обработок запросов в минуту",
    period: "минута",
    userVisible: false,
    max: 1_000_000,
  },
  {
    key: "reactionsPerMinute",
    label: "Реакции на сообщения",
    shortLabel: "Реакций в минуту",
    period: "минута",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "chatListReadsPerMinute",
    label: "Обновление списка чатов",
    shortLabel: "Обновлений чатов в минуту",
    period: "минута",
    userVisible: false,
    max: 1_000_000,
  },
  {
    key: "messageReadsPerMinute",
    label: "Проверка новых сообщений",
    shortLabel: "Проверок сообщений в минуту",
    period: "минута",
    userVisible: false,
    max: 1_000_000,
  },
  {
    key: "searchesPerMinute",
    label: "Поиск пользователей",
    shortLabel: "Поисков в минуту",
    period: "минута",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "profileViewsPerMinute",
    label: "Открытие профилей",
    shortLabel: "Профилей в минуту",
    period: "минута",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "profileUpdatesPerHour",
    label: "Изменение своего профиля",
    shortLabel: "Изменений в час",
    period: "час",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "passwordChangesPerHour",
    label: "Смена пароля",
    shortLabel: "Смен пароля в час",
    period: "час",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "nftTransfersPerHour",
    label: "Передача NFT",
    shortLabel: "Передач NFT в час",
    period: "час",
    userVisible: true,
    max: 1_000_000,
  },
  {
    key: "nftMintsPerHour",
    label: "Выпуск NFT",
    shortLabel: "Выпусков NFT в час",
    period: "час",
    userVisible: false,
    max: 1_000_000,
  },
];
