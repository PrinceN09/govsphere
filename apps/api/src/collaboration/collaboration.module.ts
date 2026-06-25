import { Module } from "@nestjs/common";

import { ChannelsModule } from "./channels/channels.module";
import { ConversationsModule } from "./conversations/conversations.module";
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
  ],
  exports: [
    ChannelsModule,
    MessagesModule,
    ConversationsModule,
    PresenceModule,
    NotificationsModule,
  ],
})
export class CollaborationModule {}
