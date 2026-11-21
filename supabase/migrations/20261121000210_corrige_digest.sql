-- Correção: no Supabase a extensão pgcrypto (função digest) fica no esquema
-- "extensions", fora do search_path destas funções. Sem isto, todo convite
-- aparecia como inválido. Inofensivo onde pgcrypto está em "public".
alter function public.accept_invitation(text, text) set search_path = public, extensions;
alter function public.invitation_preview(text) set search_path = public, extensions;
