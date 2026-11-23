-- Store the Riot summoner profile icon for leaderboard and profile display.
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS profile_icon_id INTEGER;
