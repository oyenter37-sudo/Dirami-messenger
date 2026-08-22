export type SessionUser = {
  userId: string;
  nickname: string;
  sessionVersion: number;
  displayName?: string;
  isAdmin?: boolean;
};

export type NftItem = {
  id: string;
  name: string;
  imageUrl: string;
  valueRub: number;
};

export type PublicUser = {
  id: string;
  nickname: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  profileAccent: string;
  profileBackground: string;
  createdAt?: string;
  nfts?: NftItem[];
};

export type ChatState =
  "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

export type ChatPreview = {
  user: PublicUser;
  state: Extract<ChatState, "pending_out" | "pending_in" | "accepted">;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unread: number;
};

export type UserSearchResult = {
  user: PublicUser;
  state: ChatState;
};

export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  replyTo: {
    id: string;
    content: string;
    senderId: string;
    nickname: string;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    mine: boolean;
  }[];
};
