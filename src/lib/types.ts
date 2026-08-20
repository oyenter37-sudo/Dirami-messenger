export type SessionUser = {
  userId: string;
  nickname: string;
};

export type PublicUser = {
  id: string;
  nickname: string;
  bio: string;
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
};
