/**
 * @prinodia/types
 *
 * Shared TypeScript types and interfaces for Prinodia Workspace.
 * All domain types, enums, and DTOs are defined here.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  GOVERNMENT_ADMIN = "GOVERNMENT_ADMIN",
  MINISTRY_ADMIN = "MINISTRY_ADMIN",
  DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN",
  DIVISION_ADMIN = "DIVISION_ADMIN",
  TEAM_MANAGER = "TEAM_MANAGER",
  EMPLOYEE = "EMPLOYEE",
  GUEST = "GUEST",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_ACTIVATION = "PENDING_ACTIVATION",
}

export enum MessageType {
  TEXT = "TEXT",
  FILE = "FILE",
  IMAGE = "IMAGE",
  SYSTEM = "SYSTEM",
  REPLY = "REPLY",
  FORWARDED = "FORWARDED",
}

export enum ChannelType {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  ANNOUNCEMENT = "ANNOUNCEMENT",
  DIRECT = "DIRECT",
  GROUP = "GROUP",
}

export enum FileCategory {
  DOCUMENT = "DOCUMENT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  ARCHIVE = "ARCHIVE",
  OTHER = "OTHER",
}

export enum NotificationType {
  MESSAGE = "MESSAGE",
  MENTION = "MENTION",
  REACTION = "REACTION",
  FILE_SHARED = "FILE_SHARED",
  CHANNEL_INVITE = "CHANNEL_INVITE",
  TASK_ASSIGNED = "TASK_ASSIGNED",
  SYSTEM = "SYSTEM",
}

export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DEACTIVATED = "USER_DEACTIVATED",
  FILE_UPLOADED = "FILE_UPLOADED",
  FILE_DOWNLOADED = "FILE_DOWNLOADED",
  FILE_DELETED = "FILE_DELETED",
  MESSAGE_SENT = "MESSAGE_SENT",
  MESSAGE_DELETED = "MESSAGE_DELETED",
  CHANNEL_CREATED = "CHANNEL_CREATED",
  CHANNEL_DELETED = "CHANNEL_DELETED",
  ROLE_CHANGED = "ROLE_CHANGED",
  MFA_ENABLED = "MFA_ENABLED",
  MFA_DISABLED = "MFA_DISABLED",
}

export type SupportedLanguage = "fr" | "en" | "ln" | "sw" | "lua";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["fr", "en", "ln", "sw", "lua"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

// ─── User Types ───────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  matriculeNumber: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  ministryId: string | null;
  departmentId: string | null;
  divisionId: string | null;
  preferredLanguage: SupportedLanguage;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPublic extends Pick<
  IUser,
  "id" | "displayName" | "firstName" | "lastName" | "avatarUrl" | "role"
> {}

// ─── Government Structure Types ───────────────────────────────────────────────

export interface IMinistry {
  id: string;
  name: string;
  nameTranslations: Record<SupportedLanguage, string>;
  code: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartment {
  id: string;
  ministryId: string;
  name: string;
  nameTranslations: Record<SupportedLanguage, string>;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDivision {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Channel Types ────────────────────────────────────────────────────────────

export interface IChannel {
  id: string;
  name: string;
  description: string | null;
  type: ChannelType;
  ministryId: string | null;
  departmentId: string | null;
  isArchived: boolean;
  memberCount: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export interface IMessage {
  id: string;
  channelId: string;
  senderId: string;
  sender: IUserPublic;
  type: MessageType;
  content: string;
  replyToId: string | null;
  isPinned: boolean;
  editedAt: Date | null;
  deletedAt: Date | null;
  reactions: IReaction[];
  attachments: IFileAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

// ─── File Types ───────────────────────────────────────────────────────────────

export interface IFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  storageKey: string;
  bucketName: string;
  url: string | null;
  uploadedById: string;
  channelId: string | null;
  messageId: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileAttachment extends Pick<
  IFile,
  "id" | "name" | "mimeType" | "size" | "category" | "url"
> {}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  ministryId: string | null;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── WebSocket Event Types ────────────────────────────────────────────────────

export enum WsEvent {
  // Connection
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  JOIN_CHANNEL = "join_channel",
  LEAVE_CHANNEL = "leave_channel",

  // Messages
  MESSAGE_NEW = "message:new",
  MESSAGE_UPDATED = "message:updated",
  MESSAGE_DELETED = "message:deleted",
  MESSAGE_REACTION = "message:reaction",

  // Typing
  TYPING_START = "typing:start",
  TYPING_STOP = "typing:stop",

  // Presence
  USER_ONLINE = "user:online",
  USER_OFFLINE = "user:offline",

  // Notifications
  NOTIFICATION_NEW = "notification:new",
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
}
