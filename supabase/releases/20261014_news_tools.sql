begin;
alter table public.news_items add column source_kind text not null default 'report' check(source_kind in ('official','report','opinion'));
update public.news_items set source_kind='official' where official;
create function public.sync_news_source_kind() returns trigger language plpgsql as $$begin
 if tg_op='INSERT' then
  if new.source_kind='opinion' then new.official:=false;elsif new.official or new.source_kind='official' then new.source_kind:='official';new.official:=true;end if;
 elsif new.source_kind is distinct from old.source_kind then new.official:=new.source_kind='official';
 elsif new.official is distinct from old.official then new.source_kind:=case when new.official then 'official' else 'report' end;
 end if;return new;
end$$;
create trigger source_kind_consistency before insert or update of official,source_kind on public.news_items for each row execute function public.sync_news_source_kind();
create function public.search_club_news(p_club_id uuid,p_term text default '',p_offset int default 0,p_limit int default 50) returns setof public.news_items language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if length(coalesce(p_term,''))>200 then raise exception 'Search term too long';end if;
 return query select n.* from news_items n where n.club_id=p_club_id and n.status='published' and (coalesce(btrim(p_term),'')='' or strpos(lower(coalesce(n.title,'')||' '||coalesce(n.summary,'')||' '||coalesce(n.body,'')),lower(btrim(p_term)))>0)
 order by n.published_at desc nulls last,n.id limit greatest(1,least(p_limit,100)) offset greatest(0,p_offset);
end$$;
revoke all on function public.search_club_news(uuid,text,int,int) from public,anon;
grant execute on function public.search_club_news(uuid,text,int,int) to authenticated;
commit;
