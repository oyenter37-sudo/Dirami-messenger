export type SessionUser = {
  userId: string;
  nickname: string;
  sessionVersion: number;
  displayName?: string;
  isAdmin?: boolean;
  isVerified?: boolean;
  isHyperVerified?: boolean;
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
  isHyperVerified: boolean;
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
    isHyperVerified: boolean;
  };
};

export type PublicUser = {
  id: string;
  nickname: string;
  displayName: string;
  isVerified: boolean;
  isHyperVerified: boolean;
  bio: string;
  extraProfile: string;
  avatarUrl: string;
  profileAccent: string;
  profileBackground: string;
  createdAt?: string;
  nfts?: NftItem[];
};

export type ChatState =
  "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

export type VoiceMessageMeta = {
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  listenedAt: string | null;
  available: boolean;
};

export type ChatPreview = {
  user: PublicUser;
  state: Extract<ChatState, "pending_out" | "pending_in" | "accepted">;
  lastMessage: {
    id: string;
    kind: "text" | "voice";
    content: string;
    createdAt: string;
    senderId: string;
    voiceDurationMs: number | null;
    voiceListenedAt: string | null;
  } | null;
  unread: number;
};

export type UserSearchResult = {
  user: PublicUser;
  state: ChatState;
};

export type ChatMessage = {
  id: string;
  kind: "text" | "voice";
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  voice: VoiceMessageMeta | null;
  replyTo: {
    id: string;
    kind: "text" | "voice";
    content: string;
    senderId: string;
    nickname: string;
    isVerified: boolean;
    isHyperVerified: boolean;
    voiceDurationMs: number | null;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    mine: boolean;
  }[];
};
