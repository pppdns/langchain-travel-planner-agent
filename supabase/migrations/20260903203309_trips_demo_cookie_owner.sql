-- Demo trips are owned by a server-issued cookie identity.
-- That id may not exist in auth.users when anonymous sign-in is off.
-- RLS still requires auth.uid() for Data API access.

alter table public.trips drop constraint trips_user_id_fkey;
