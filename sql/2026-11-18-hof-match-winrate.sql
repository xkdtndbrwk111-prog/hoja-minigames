-- Atomic two-student match recording. Existing class-code access model remains.
-- Keep past winning rows; never invent missing historical losses.
CREATE OR REPLACE FUNCTION public.hof_add_match(p_code text,p_seats integer[],p_game text,p_winner integer,p_at timestamptz,p_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $body$
declare c public.hof_classes; k text; at_time timestamptz:=now();
begin
  select * into c from public.hof_classes where code=upper(trim(p_code)) for update;
  if not found then return 'no_class'; end if;
  if p_game is null or p_game not in ('hockey','volley','bubble','othello','gomoku','ttt','germ','rally') then return 'bad_game'; end if;
  if p_seats is null or cardinality(p_seats)<>2 or array_ndims(p_seats)<>1 or array_lower(p_seats,1)<>1 or p_seats[1] is null or p_seats[2] is null or p_seats[1] not between 1 and 40 or p_seats[2] not between 1 and 40 or p_seats[1]=p_seats[2] then return 'bad_seat'; end if;
  if p_winner is null or p_winner not in(-1,0,1) then return 'bad_score'; end if;
  if p_key is null or p_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return 'bad_key'; end if;
  k:='match-v1-'||p_key||'-';
  if exists(select 1 from public.hof_records where class_id=c.id and request_key like k||'%') then return 'ok'; end if;
  if not c.recording then return 'paused'; end if;
  if exists(select 1 from public.hof_records r where r.class_id=c.id and r.seat=any(p_seats) and r.game=p_game and r.received_at>now()-interval '3 seconds') then return 'too_fast'; end if;
  if (select count(*) from public.hof_records r where r.class_id=c.id and r.received_at>now()-interval '1 day')>=2999 then return 'too_many'; end if;
  if p_at is not null and p_at<=now() and p_at>now()-interval '7 days' then at_time:=p_at; end if;
  insert into public.hof_records(class_id,seat,game,score,played_at,request_key)
  select c.id,p_seats[i],p_game,case when p_winner=i-1 then 1 else 0 end,at_time,k||i||'-'||case when p_winner=-1 then 'd' when p_winner=i-1 then 'w' else 'l' end
  from generate_series(1,2) as s(i);
  return 'ok';
end $body$;
revoke all on function public.hof_add_match(text,integer[],text,integer,timestamptz,text) from public;
grant execute on function public.hof_add_match(text,integer[],text,integer,timestamptz,text) to anon,authenticated,service_role;

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
            case when r.game in ('hockey','volley','bubble','othello','gomoku','ttt','germ','rally') then sum(r.score) else max(r.score) end::bigint as value,
            count(*) filter(where r.request_key like 'match-v1-%')::integer as played,
            count(*) filter(where r.game in ('hockey','volley','bubble','othello','gomoku','ttt','germ','rally') and r.score>0 and (r.request_key is null or r.request_key not like 'match-v1-%'))::integer as legacy_wins
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
        select w.seat, w.game, w.members, w.value, w.played, w.legacy_wins,
          case when w.game in ('shop_solo','shop_vs2','shop_co2','shop_co4','stairs_solo','stairs_race','jump_solo','jump_duel','flash_solo','flash_r8','flash_r12','dance_solo','dance_duo')
            then (select min(r2.played_at) from public.hof_records r2 where r2.class_id = c.id and r2.seat = w.seat and r2.game = w.game and r2.members is not distinct from w.members and r2.score = w.value
                   and (r2.played_at at time zone 'Asia/Seoul') >= p_start::timestamp and (r2.played_at at time zone 'Asia/Seoul') < (p_start + 7)::timestamp)
            else w.last_at end as reached
        from (
          select r.seat, r.game, r.members,
            case when r.game in ('hockey','volley','bubble','othello','gomoku','ttt','germ','rally') then sum(r.score) else max(r.score) end::bigint as value,
            count(*) filter(where r.request_key like 'match-v1-%')::integer as played,
            count(*) filter(where r.game in ('hockey','volley','bubble','othello','gomoku','ttt','germ','rally') and r.score>0 and (r.request_key is null or r.request_key not like 'match-v1-%'))::integer as legacy_wins,
            max(r.played_at) filter(where r.score>0) as last_at
          from public.hof_records r
          where r.class_id = c.id
            and (r.played_at at time zone 'Asia/Seoul') >= p_start::timestamp
            and (r.played_at at time zone 'Asia/Seoul') < (p_start + 7)::timestamp
          group by r.seat, r.game, r.members
        ) w
      ) a), '[]'::json));
end $function$;
