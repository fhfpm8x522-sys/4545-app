begin;
create table public.player_shirt_history (
 id uuid primary key default gen_random_uuid(),player_id uuid not null references public.players(id) on delete cascade,
 club_id uuid references public.clubs(id),shirt_number text not null check(length(shirt_number)<=20),
 observed_at timestamptz not null default now(),source text not null default 'GOAL roster sync',source_url text
);
alter table public.player_shirt_history enable row level security;
create policy "shirt history read" on public.player_shirt_history for select to authenticated using(true);
create policy "shirt history owner write" on public.player_shirt_history for all to authenticated using(public.has_permission('owner.override')) with check(public.has_permission('owner.override'));
revoke all on public.player_shirt_history from anon,authenticated;
grant select,insert,update,delete on public.player_shirt_history to authenticated;
grant all on public.player_shirt_history to service_role;
insert into public.player_shirt_history(player_id,club_id,shirt_number,source) select id,club_id,coalesce(nullif(shirt_number,''),number::text),'Initial observed roster' from public.players where active and coalesce(nullif(shirt_number,''),number::text) is not null;
create function public.capture_player_shirt() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 if coalesce(nullif(new.shirt_number,''),new.number::text) is not null and (tg_op='INSERT' or coalesce(nullif(new.shirt_number,''),new.number::text) is distinct from coalesce(nullif(old.shirt_number,''),old.number::text) or new.club_id is distinct from old.club_id) then
  insert into player_shirt_history(player_id,club_id,shirt_number) values(new.id,new.club_id,coalesce(nullif(new.shirt_number,''),new.number::text));
 end if;return new;
end$$;
create trigger record_player_shirt after insert or update of shirt_number,number,club_id on public.players for each row execute function public.capture_player_shirt();
commit;
