-- Index foreign keys used by moderation screens and account cleanup.
create index if not exists social_blocks_blocked_account_idx on puppy_social.blocks(blocked_account_uuid);
create index if not exists social_memberships_account_idx on puppy_social.memberships(account_uuid);
create index if not exists social_messages_channel_server_idx on puppy_social.messages(channel_id,server_id);
create index if not exists social_messages_moderated_by_idx on puppy_social.messages(moderated_by);
create index if not exists social_messages_server_idx on puppy_social.messages(server_id);
create index if not exists social_moderation_actor_idx on puppy_social.moderation_actions(actor_account_uuid);
create index if not exists social_moderation_message_idx on puppy_social.moderation_actions(message_id);
create index if not exists social_mutes_issued_idx on puppy_social.mutes(issued_by);
create index if not exists social_mutes_server_idx on puppy_social.mutes(server_id);
create index if not exists social_reports_resolved_by_idx on puppy_social.reports(resolved_by);
