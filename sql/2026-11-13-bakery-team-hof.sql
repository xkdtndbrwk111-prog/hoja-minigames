-- Separate bakery scoring by ruleset. Preserve all pre-existing records and identifiers.
-- Apply before deploying the corresponding JavaScript client.
alter table public.hof_records add column if not exists members integer[];
alter table public.hof_records add column if not exists request_key text;
create unique index if not exists hof_records_team_request on public.hof_records(class_id,request_key)
  where request_key is not null;

create or replace function public.hof_add_team_record(
  p_code text, p_seats integer[], p_game text, p_score integer,
  p_at timestamp with time zone, p_key text
) returns text
language plpgsql security definer set search_path to 'pg_catalog', 'public'
as $team$
declare
  c public.hof_classes;
  ordered_seats integer[];
  expected integer;
  at_time timestamptz := now();
begin
  select * into c from public.hof_classes where code=upper(trim(p_code));
  if not found then return 'no_class'; end if;
  if not c.recording then return 'paused'; end if;
  expected := case p_game when 'shop_co2' then 2 when 'shop_co4' then 4 else null end;
  if expected is null then return 'bad_game'; end if;
  if p_seats is null or cardinality(p_seats)<>expected
    or exists (select 1 from unnest(p_seats) as u(n) where n is null or n<1 or n>40)
  then return 'bad_seat'; end if;
  select array_agg(s.n order by s.n) into ordered_seats
    from (select distinct unnest(p_seats) as n) s;
  if cardinality(ordered_seats)<>expected then return 'bad_seat'; end if;
  if p_score is null or p_score<0 or p_score>10000000 then return 'bad_score'; end if;
  if p_key is null or p_key !~ '^[0-9a-z]{2,20}-[0-9a-z]{4,20}$' then return 'bad_key'; end if;
  if exists (select 1 from public.hof_records r
    where r.class_id=c.id and r.request_key=p_key) then return 'ok'; end if;
  if exists (select 1 from public.hof_records r
    where r.class_id=c.id and r.game=p_game and r.members=ordered_seats
      and r.received_at>now()-interval '3 seconds')
  then return 'too_fast'; end if;
  if (select count(*) from public.hof_records r
    where r.class_id=c.id and r.received_at>now()-interval '1 day')>=3000
  then return 'too_many'; end if;
  if p_at is not null and p_at<=now() and p_at>now()-interval '7 days'
  then at_time:=p_at; end if;
  insert into public.hof_records(class_id,seat,game,score,played_at,members,request_key)
    values (c.id,ordered_seats[1],p_game,p_score,at_time,ordered_seats,p_key)
    on conflict do nothing;
  return 'ok';
end
$team$;
revoke execute on function public.hof_add_team_record(text,integer[],text,integer,timestamptz,text) from public;
grant execute on function public.hof_add_team_record(text,integer[],text,integer,timestamptz,text) to anon,authenticated;
CREATE OR REPLACE FUNCTION public.hof_add_record(p_code text, p_seat integer, p_game text, p_score integer, p_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  c public.hof_classes;
  limit_score int;
  at_time timestamptz := now();
begin
  select * into c from public.hof_classes where code = upper(trim(p_code));
  if not found then return 'no_class'; end if;
  if not c.recording then return 'paused'; end if;
  if p_seat is null or p_seat not between 1 and 40 then return 'bad_seat'; end if;
  limit_score := case p_game
    when 'stairs' then 5000 when 'jump' then 2000 when 'shop' then 10000000
    when 'shop_solo' then 10000000 when 'shop_vs2' then 10000000
    when 'hockey' then 1 when 'othello' then 1 when 'gomoku' then 1 when 'bubble' then 1
    when 'volley' then 1 when 'ttt' then 1 when 'germ' then 1 when 'rally' then 1 else null end;
  if limit_score is null or p_score is null or p_score < 0 or p_score > limit_score then return 'bad_score'; end if;
  if exists (select 1 from public.hof_records r where r.class_id = c.id and r.seat = p_seat and r.game = p_game and r.received_at > now() - interval '3 seconds') then
    return 'too_fast';
  end if;
  if (select count(*) from public.hof_records r where r.class_id = c.id and r.received_at > now() - interval '1 day') >= 3000 then
    return 'too_many';
  end if;
  -- A saved record from a moment offline keeps its real time, within a week.
  if p_at is not null and p_at <= now() and p_at > now() - interval '7 days' then at_time := p_at; end if;
  insert into public.hof_records (class_id, seat, game, score, played_at) values (c.id, p_seat, p_game, p_score, at_time);
  return 'ok';
end $function$;

CREATE OR REPLACE FUNCTION public.hof_board(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  c public.hof_classes;
  local_now timestamp := now() at time zone 'Asia/Seoul';
  school_year_start date;
begin
  select * into c from public.hof_classes where code = upper(trim(p_code));
  if not found then return json_build_object('error', 'no_class'); end if;
  -- The Korean school year starts in March.
  school_year_start := make_date(extract(year from local_now)::int - case when extract(month from local_now) < 3 then 1 else 0 end, 3, 1);
  return json_build_object(
    'recording', c.recording,
    'periods', (
      select json_object_agg(p.name, coalesce((
        select json_agg(row_to_json(a)) from (
          select r.seat, r.game, r.members,
            case when r.game in ('stairs','jump','shop','shop_solo','shop_vs2','shop_co2','shop_co4') then max(r.score) else count(*) end::bigint as value
          from public.hof_records r
          where r.class_id = c.id and (r.played_at at time zone 'Asia/Seoul') >= p.since
          group by r.seat, r.game, r.members
        ) a), '[]'::json))
      from (values
        ('day', date_trunc('day', local_now)),
        ('week', date_trunc('week', local_now)),
        ('month', date_trunc('month', local_now)),
        ('year', school_year_start::timestamp)
      ) as p(name, since)
    ));
end $function$;

CREATE OR REPLACE FUNCTION public.hof_week(p_code text, p_start date)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  c public.hof_classes;
  local_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select * into c from public.hof_classes where code = upper(trim(p_code));
  if not found then return json_build_object('error', 'no_class'); end if;
  if p_start is null or extract(isodow from p_start) <> 1 then return json_build_object('error', 'not_monday'); end if;
  if p_start + 7 > local_today or p_start < local_today - 400 then return json_build_object('error', 'bad_week'); end if;
  return json_build_object(
    'week', p_start,
    'rows', coalesce((
      select json_agg(row_to_json(a)) from (
        select w.seat, w.game, w.members, w.value,
          case when w.game in ('stairs','jump','shop','shop_solo','shop_vs2','shop_co2','shop_co4')
            then (select min(r2.played_at) from public.hof_records r2 where r2.class_id = c.id and r2.seat = w.seat and r2.game = w.game and r2.members is not distinct from w.members and r2.score = w.value
                   and (r2.played_at at time zone 'Asia/Seoul') >= p_start::timestamp and (r2.played_at at time zone 'Asia/Seoul') < (p_start + 7)::timestamp)
            else w.last_at end as reached
        from (
          select r.seat, r.game, r.members,
            case when r.game in ('stairs','jump','shop','shop_solo','shop_vs2','shop_co2','shop_co4') then max(r.score) else count(*) end::bigint as value,
            max(r.played_at) as last_at
          from public.hof_records r
          where r.class_id = c.id
            and (r.played_at at time zone 'Asia/Seoul') >= p_start::timestamp
            and (r.played_at at time zone 'Asia/Seoul') < (p_start + 7)::timestamp
          group by r.seat, r.game, r.members
        ) w
      ) a), '[]'::json));
end $function$;

CREATE OR REPLACE FUNCTION public.hof_recent(p_code text, p_teacher text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare c public.hof_classes := public.hof_teacher_class(p_code, p_teacher);
begin
  return coalesce((select json_agg(row_to_json(a)) from (
    select id, seat, game, members, score, played_at from public.hof_records where class_id = c.id order by played_at desc limit 60
  ) a), '[]'::json);
end $function$;

CREATE OR REPLACE FUNCTION public.hof_clear_seat(p_code text, p_teacher text, p_seat integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare c public.hof_classes := public.hof_teacher_class(p_code, p_teacher); n integer;
begin
  delete from public.hof_records where class_id = c.id and (seat = p_seat or members @> array[p_seat]);
  get diagnostics n = row_count;
  return n;
end $function$;
