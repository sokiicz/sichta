-- Šichta — RPC. Spustit po 01-schema.sql.
--
-- Tohle je celé rozhraní, které klient má. Nic jiného mu není přístupné.
-- Funkce jsou SECURITY DEFINER, takže obcházejí RLS, ale každá si sama
-- ověří client_token a sama rozhodne, co smí ven.

-- ---------------------------------------------------------------- pomocné

create or replace function _player_by_token(p_code text, p_token text)
returns players
language sql stable security definer set search_path = public as $$
  select p.* from players p
  join rooms r on r.id = p.room_id
  where r.code = upper(p_code) and p.client_token = p_token
  limit 1;
$$;

create or replace function _new_code()
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  -- bez I, O, 0, 1: přes stůl se to plete
  abeceda constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  kod text;
begin
  loop
    kod := '';
    for _ in 1..6 loop
      kod := kod || substr(abeceda, 1 + floor(random() * length(abeceda))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = kod);
  end loop;
  return kod;
end;
$$;

-- ---------------------------------------------------------------- založení

create or replace function create_room(p_name text, p_token text)
returns table (code text, player_id uuid)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_room rooms;
  v_player players;
begin
  if char_length(trim(p_name)) = 0 then
    raise exception 'Bez přezdívky to nejde.';
  end if;

  insert into rooms (code, host_token)
  values (_new_code(), p_token)
  returning * into v_room;

  insert into players (room_id, name, seat, client_token, is_host)
  values (v_room.id, left(trim(p_name), 12), 0, p_token, true)
  returning * into v_player;

  return query select v_room.code, v_player.id;
end;
$$;

create or replace function join_room(p_code text, p_name text, p_token text)
returns table (code text, player_id uuid)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_room rooms;
  v_player players;
  v_seat int;
begin
  select * into v_room from rooms where rooms.code = upper(p_code);
  if v_room.id is null then
    raise exception 'Šichta s kódem % neexistuje.', upper(p_code);
  end if;
  if v_room.status <> 'satna' then
    raise exception 'Tahle šichta už běží, připojit se nejde.';
  end if;

  -- návrat téhož zařízení není nový hráč
  select * into v_player from players
   where room_id = v_room.id and client_token = p_token;
  if v_player.id is not null then
    update players set last_seen_at = now() where id = v_player.id;
    return query select v_room.code, v_player.id;
    return;
  end if;

  select coalesce(max(seat), -1) + 1 into v_seat from players where room_id = v_room.id;
  if v_seat > 11 then
    raise exception 'Šichta je plná, dvanáct je strop.';
  end if;

  insert into players (room_id, name, seat, client_token)
  values (v_room.id, left(trim(p_name), 12), v_seat, p_token)
  returning * into v_player;

  return query select v_room.code, v_player.id;
end;
$$;

-- ---------------------------------------------------------------- čtení

-- Jediné čtecí API. Vrací hotový objekt pro TOHOTO hráče v TÉTO fázi.
-- Role ostatních se ven nikdy nedostane, s jedinou výjimkou: sabotér vidí
-- ostatní sabotéry, protože informovaná menšina je pravidlo hry.
create or replace function get_my_view(p_code text, p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me    players;
  v_room  rooms;
  v_role  text;
  v_mates jsonb := '[]'::jsonb;
begin
  select * into v_me from _player_by_token(p_code, p_token);
  if v_me.id is null then
    raise exception 'Tahle šichta tě nezná. Připoj se znovu.';
  end if;
  select * into v_room from rooms where id = v_me.room_id;

  select role into v_role from roles where player_id = v_me.id;

  if v_role = 'saboter' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', p.id, 'jmeno', p.name, 'predak', r.is_foreman)), '[]'::jsonb)
      into v_mates
      from roles r join players p on p.id = r.player_id
     where r.room_id = v_me.room_id and r.role = 'saboter' and p.id <> v_me.id;
  end if;

  return jsonb_build_object(
    'kod',        v_room.code,
    'faze',       v_room.phase,
    'kolo',       v_room.round_no,
    'konciV',     v_room.phase_ends_at,
    'pauza',      v_room.paused_reason,
    'serverCas',  now(),
    'ja', jsonb_build_object(
      'id', v_me.id, 'jmeno', v_me.name, 'zivy', v_me.alive,
      'hlasStinuUtracen', v_me.ghost_used, 'zakladatel', v_me.is_host,
      'role', v_role, 'spoluSaboteri', v_mates
    ),
    -- veřejný stav: role v něm nejsou, jen to, co vidí celý stůl
    'stul',       v_room.state -> 'verejne',
    'hraci', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', p.id, 'jmeno', p.name, 'zivy', p.alive,
               'hlasStinuUtracen', p.ghost_used, 'pripojeny',
               p.last_seen_at > now() - interval '20 seconds'
             ) order by p.seat), '[]'::jsonb)
        from players p where p.room_id = v_me.room_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------- zápis

create or replace function submit_action(
  p_code text, p_token text, p_kind text, p_payload jsonb
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_me   players;
  v_room rooms;
begin
  select * into v_me from _player_by_token(p_code, p_token);
  if v_me.id is null then
    raise exception 'Tahle šichta tě nezná.';
  end if;
  select * into v_room from rooms where id = v_me.room_id;

  if v_room.paused_reason is not null then
    raise exception 'Hra stojí, počkej.';
  end if;

  insert into actions (room_id, player_id, round_no, phase, kind, payload)
  values (v_me.room_id, v_me.id, v_room.round_no, v_room.phase, p_kind, p_payload)
  on conflict (room_id, round_no, player_id, kind)
    do update set payload = excluded.payload, created_at = now();

  update players set last_seen_at = now() where id = v_me.id;
  update rooms   set updated_at   = now() where id = v_room.id;
end;
$$;

-- Posun fáze. Volá ji kterýkoliv klient, co si všimne, že doběhl odpočet.
-- Je idempotentní: druhé zavolání na stejnou fázi a kolo neudělá nic, takže
-- nevadí, že ji pošle deset telefonů naráz.
create or replace function advance_phase(
  p_code text, p_token text, p_expected_phase text, p_expected_round int,
  p_next_state jsonb, p_next_phase text, p_next_round int, p_next_ends_at timestamptz
) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_me players;
  v_ok int;
begin
  select * into v_me from _player_by_token(p_code, p_token);
  if v_me.id is null then
    raise exception 'Tahle šichta tě nezná.';
  end if;

  update rooms
     set state = p_next_state,
         phase = p_next_phase,
         round_no = p_next_round,
         phase_ends_at = p_next_ends_at,
         status = case when p_next_phase = 'konec' then 'konec'
                       when p_next_phase = 'satna' then 'satna'
                       else 'hra' end,
         updated_at = now()
   where id = v_me.room_id
     and phase = p_expected_phase
     and round_no = p_expected_round
     and paused_reason is null;

  get diagnostics v_ok = row_count;
  return v_ok > 0;
end;
$$;

create or replace function heartbeat(p_code text, p_token text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_me players;
begin
  select * into v_me from _player_by_token(p_code, p_token);
  if v_me.id is null then return; end if;
  update players set last_seen_at = now() where id = v_me.id;
end;
$$;

-- ---------------------------------------------------------------- oprávnění

revoke all on function create_room, join_room, get_my_view, submit_action,
                      advance_phase, heartbeat from public;

grant execute on function create_room(text, text)                        to anon, authenticated;
grant execute on function join_room(text, text, text)                    to anon, authenticated;
grant execute on function get_my_view(text, text)                        to anon, authenticated;
grant execute on function submit_action(text, text, text, jsonb)         to anon, authenticated;
grant execute on function advance_phase(text, text, text, int, jsonb, text, int, timestamptz)
                                                                         to anon, authenticated;
grant execute on function heartbeat(text, text)                          to anon, authenticated;

-- _player_by_token a _new_code zůstávají jen serveru
revoke execute on function _player_by_token(text, text) from anon, authenticated;
revoke execute on function _new_code() from anon, authenticated;
