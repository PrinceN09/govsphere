import { Module } from "@nestjs/common";

import { BookmarksModule } from "./bookmarks/bookmarks.module";
import { ChannelsModule } from "./channels/channels.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { DraftsModule } from "./drafts/drafts.module";
import { MessagesModule } from "./messages/messages.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PresenceModule } from "./presence/presence.module";

@Module({
  imports: [
    ChannelsModule,
    MessagesModule,
    ConversationsModule,
    PresenceModule,
    NotificationsModule,
    DraftsModule,
    BookmarksModule,
  ],
  exports: [
    ChannelsModule,
    MessagesModule,
    ConversationsModule,
    PresenceModule,
    NotificationsModule,
    DraftsModule,
    BookmarksModule,
  ],
})
export class CollaborationModule {}
