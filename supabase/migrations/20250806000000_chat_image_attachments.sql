-- Persist chat image attachments so loaded conversations keep the visual
-- context the assistant's analysis was based on.
alter table public.chat_messages add column if not exists image text;