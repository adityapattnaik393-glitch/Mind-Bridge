-- ============================================================
-- DATABASE SCHEMA UPDATES FOR STREAK CALCULATION
-- ============================================================
-- Add these to your supabase/schema.sql or run in SQL Editor

-- ============================================================
-- 1. UPDATE DAILY_PROGRESS VIEW TO INCLUDE STREAK
-- ============================================================

-- Drop the old view
drop view if exists public.daily_progress cascade;

-- Create new view with streak calculation
create or replace view public.daily_progress
with (security_invoker = true) as
select
  gs.user_id,
  (gs.created_at at time zone 'Asia/Kolkata')::date as day,
  count(*)                                       as sessions,
  round(avg(gs.score))::int                     as avg_score,
  max(gs.score)                                 as best_score,
  min(gs.score)                                 as low_score,
  round(sum(coalesce(gs.duration_seconds, 180)) / 60.0)::int as minutes,
  p.streak                                      as streak
from public.game_scores gs
join public.patients p on gs.user_id = p.user_id
group by gs.user_id, (gs.created_at at time zone 'Asia/Kolkata')::date, p.streak;

-- ============================================================
-- 2. CREATE TRIGGER TO UPDATE STREAK ON NEW SCORE
-- ============================================================

-- Drop existing trigger if any
drop trigger if exists update_streak_on_score_insert on public.game_scores;
drop function if exists public.calculate_and_update_streak();

-- Create function to calculate streak
create or replace function public.calculate_and_update_streak()
returns trigger as $$
declare
  v_streak integer := 0;
  v_latest_date date;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- Count consecutive session days from today, or from yesterday if no session
  -- has been recorded yet today.
  with date_list as (
    select distinct (created_at at time zone 'Asia/Kolkata')::date as game_date
    from public.game_scores
    where user_id = new.user_id
    order by game_date desc
  ),
  latest as (
    select max(game_date) as game_date from date_list
  ),
  consecutive as (
    select game_date,
           row_number() over (order by game_date desc) - 1 as days_back
    from date_list
  ),
  streak_count as (
    select count(*) as streak
    from consecutive
    cross join latest
    where latest.game_date >= v_today - 1
      and game_date = latest.game_date - days_back::integer
  )
  select streak into v_streak from streak_count;

  -- Update patients table with new streak
  update public.patients
  set streak = coalesce(v_streak, 0)
  where user_id = new.user_id;

  return new;
end;
$$ language plpgsql;

-- Create trigger on game_scores insert
create trigger update_streak_on_score_insert
after insert on public.game_scores
for each row
execute procedure public.calculate_and_update_streak();

-- ============================================================
-- 3. VERIFY DAILY_PROGRESS VIEW HAS RLS
-- ============================================================

-- Make sure the view respects RLS
alter view public.daily_progress set (security_invoker = true);

-- ============================================================
-- 4. ADD INDEX FOR PERFORMANCE
-- ============================================================

-- Index for fast streak calculation
create index if not exists game_scores_user_created_idx
on public.game_scores (user_id, (created_at at time zone 'Asia/Kolkata')::date);

-- Index for dashboard queries
create index if not exists daily_progress_user_date_idx
on public.game_scores (user_id, created_at desc);

-- ============================================================
-- 5. BACKFILL STREAK VALUES
-- ============================================================

-- If you have existing users, calculate their streaks
-- Run this ONCE to populate streak values

do $$
declare
  v_user_id uuid;
  v_streak integer;
  v_game_count integer;
begin
  for v_user_id in select distinct user_id from public.game_scores loop
    -- Count consecutive days
    with date_list as (
      select distinct (created_at at time zone 'Asia/Kolkata')::date as game_date
      from public.game_scores
      where user_id = v_user_id
      order by game_date desc
    ),
    consecutive as (
      select game_date,
             row_number() over (order by game_date desc) as days_back
      from date_list
    )
    select count(*)
    into v_streak
    from consecutive
    where game_date >= current_date - (days_back - 1);

    -- Update if streak > 0
    if v_streak > 0 then
      update public.patients
      set streak = v_streak
      where user_id = v_user_id;
    end if;
  end loop;
end $$;

-- ============================================================
-- 6. VERIFY SETUP
-- ============================================================

-- Check if view exists and has streak column
-- select * from public.daily_progress limit 1;

-- Check if trigger exists
-- select tgname from pg_trigger where tgrelname = 'game_scores';

-- Check streak values
-- select name, streak, created_at from public.patients order by streak desc limit 5;

-- ============================================================
-- NOTE: Run these queries to test after implementation
-- ============================================================

/*
-- Test 1: Check if daily_progress view has streak
select column_name from information_schema.columns 
where table_name = 'daily_progress' and column_name = 'streak';

-- Test 2: Check streak values
select id, name, streak from patients limit 5;

-- Test 3: Verify trigger exists
select trigger_name from information_schema.triggers 
where event_object_table = 'game_scores';

-- Test 4: Check recent scores
select user_id, score, game_name, created_at 
from game_scores 
order by created_at desc 
limit 10;

-- Test 5: Verify daily_progress data
select user_id, day, sessions, best_score, streak 
from daily_progress 
order by day desc 
limit 7;
*/
