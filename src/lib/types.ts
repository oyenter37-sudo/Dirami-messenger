export type SessionUser = {
  userId: string;
  nickname: string;
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
  bio: string;
  createdAt?: string;
  nfts?: NftItem[];
};

export type ChatPreview = {
  user: PublicUser;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unread: number;
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
