begin;
alter table public.club_history add column if not exists source_url text;
alter table public.club_trophies add column if not exists source_url text;
update public.clubs set stadium='אצטדיון טוטו ע״ש טרנר',founded_year=1949,city='באר שבע',league='ליגת העל',description='מועדון הכדורגל של באר שבע, שנוסד ב־1949. שתי אליפויות בשנות השבעים, שלוש אליפויות רצופות בעשור הקודם ואליפות שישית בעונת 2025/26.' where name_he='הפועל באר שבע';
insert into public.club_trophies(club_id,name,count,years,sort_order,source_url)
select c.id,v.name,v.count,v.years,v.sort_order,v.source from public.clubs c cross join (values
('אליפויות ישראל',6,'["1974/75","1975/76","2015/16","2016/17","2017/18","2025/26"]'::jsonb,0,'https://www.football.org.il/clubs/club-titles/?club_id=2171'),
('גביעי מדינה',4,'["1996/97","2019/20","2021/22","2024/25"]'::jsonb,1,'https://www.football.org.il/clubs/club-titles/?club_id=2171'),
('אלוף האלופים',5,'["1975","2016","2017","2022","2025"]'::jsonb,2,'https://hbsfc.co.il/club-history/')
) v(name,count,years,sort_order,source) where c.name_he='הפועל באר שבע' and not exists(select 1 from club_trophies t where t.club_id=c.id and t.name=v.name);
insert into public.club_history(club_id,event_date,title,body,source_url)
select c.id,v.day::date,v.title,v.body,v.source from public.clubs c cross join (values
('1949-01-01','הקמת המועדון','המועדון נוסד בשנת 1949. תאריך זה מציין את שנת ההקמה.','https://hbsfc.co.il/club-history/'),
('2018-05-01','שלוש אליפויות רצופות','אליפויות בעונות 2015/16, 2016/17 ו־2017/18. תאריך זה מציין את עונת הזכייה האחרונה ברצף.','https://www.football.org.il/clubs/club-titles/?club_id=2171'),
('2025-05-29','הגביע הרביעי','זכייה בגביע המדינה לאחר ניצחון בגמר על בית״ר ירושלים.','https://hbsfc.co.il/club-history/'),
('2026-05-19','האליפות השישית','זכייה באליפות ליגת העל לעונת 2025/26.','https://www.football.org.il/clubs/club/?itemid=%7B40046E65-E548-4CF9-8ABE-F153BD8710F8%7D')
) v(day,title,body,source) where c.name_he='הפועל באר שבע' and not exists(select 1 from club_history h where h.club_id=c.id and h.title=v.title);
commit;
