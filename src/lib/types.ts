export type SessionUser = {
  userId: string;
  nickname: string;
  sessionVersion: number;
  displayName?: string;
  isAdmin?: boolean;
  isVerified?: boolean;
};

export type NftItem = {
  id: string;
  name: string;
  imageUrl: string;
  valueRub: number;
};

export type NftDetails = NftItem & {
  createdAt: string;
  receivedAt: string;
  transferCount: number;
  owner: NftPerson;
  creator: NftPerson | null;
  receivedFrom: NftPerson | null;
};

export type NftPerson = {
  id: string;
  nickname: string;
  displayName: string;
  isVerified: boolean;
};

export type NewsItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  unread: boolean;
  author: {
    nickname: string;
    displayName: string;
    isVerified: boolean;
  };
};

export type PublicUser = {
  id: string;
  nickname: string;
  displayName: string;
  isVerified: boolean;
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
    isVerified: boolean;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    mine: boolean;
  }[];
};
