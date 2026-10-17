import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../public/admin-full/index.html',import.meta.url),'utf8');
const start=html.indexOf('const legacyNewsItems=');
const end=html.indexOf('render.polls=',start);
assert.ok(start>=0&&end>start,'Legacy news action section exists');
const source=html.slice(start,end);
const id='03bc1661-7747-4d30-a114-181cb134dfe2',club='3975c9e3-62ec-41d8-908c-43561fc5151e';

async function setup(permissions,status='pending',options={}){
 const calls=[],notifications=[],shown=[],navigation=[],writes=[],conditions=[];
 let actions='';
 const item={id,club_id:club,title:'כותרת עם גרש\' ותג <script>',status};
 const context={URL,Map,Set,Error,window:{},me:{user_id:'editor',permissions},clubs:[{id:club}],location:{href:'https://fhfpm8x522-sys.github.io/4545-app/admin-full/',assign:url=>navigation.push(url)},cf:()=>club,notify:(text,bad)=>notifications.push({text,bad}),show:async page=>shown.push(page),rows:async()=>[item],head:()=>'',esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),clubName:()=>'',render:{},main:{innerHTML:''},table:(_rows,_cols,action)=>{actions=action(item);return actions;},db:{rpc:async(name,args)=>{calls.push({name,args:JSON.parse(JSON.stringify(args))});return options.rpc?await options.rpc(name,args):{data:{...item,status:'published'},error:null};},from:table=>{assert.equal(table,'news_items');const query={update:payload=>{writes.push(JSON.parse(JSON.stringify(payload)));return query;},eq:(key,value)=>{conditions.push([key,value]);return query;},select:()=>query,maybeSingle:async()=>({data:{...item,status:'approved'},error:null})};return query;}}};
 vm.runInNewContext(source,context);
 await context.render.news();
 return {context,item,calls,notifications,shown,navigation,writes,conditions,actions};
}

test('legacy pending approval publishes atomically through the authenticated RPC',async()=>{
 const s=await setup(['news.review','news.publish']);
 assert.match(s.actions,/אישור ופרסום/);
 assert.doesNotMatch(s.actions,/onclick='editNews\(/);
 await s.context.window.publishLegacyNews(id);
 assert.deepEqual(s.calls,[{name:'approve_and_publish_news',args:{p_id:id}}]);
 assert.equal(s.writes.length,0,'Publication never uses a client status/timestamp patch');
 assert.deepEqual(s.shown,['news']);
 assert.equal(s.notifications[0].text,'הכתבה פורסמה באתר');
});

test('review-only staff approve explicitly without publishing and cannot call the publish action',async()=>{
 const s=await setup(['news.review']);
 assert.match(s.actions,/אישור בלבד · עדיין לא באתר/);
 assert.doesNotMatch(s.actions,/אישור ופרסום/);
 await s.context.window.publishLegacyNews(id);
 assert.equal(s.calls.length,0);
 await s.context.window.approveLegacyNews(id);
 assert.deepEqual(s.writes,[{status:'approved',approved_by:'editor'}]);
 assert.deepEqual(s.conditions,[['id',id],['status','pending']]);
 assert.deepEqual(s.calls.map(c=>c.name),['write_audit']);
 assert.match(s.notifications.at(-1).text,/עדיין אינה מוצגת באתר/);
});

test('publisher can publish an approved article but cannot approve a pending article without review permission',async()=>{
 const approved=await setup(['news.publish'],'approved');
 assert.match(approved.actions,/פרסום באתר/);
 await approved.context.window.publishLegacyNews(id);
 assert.equal(approved.calls[0].name,'approve_and_publish_news');
 const pending=await setup(['news.publish']);
 await pending.context.window.publishLegacyNews(id);
 assert.equal(pending.calls.length,0);
});

test('publication failure reports the server error and never announces a successful publication',async()=>{
 const s=await setup(['news.review','news.publish'],'pending',{rpc:async()=>({error:{message:'יש להשלים תוכן ותמונה'}})});
 await s.context.window.publishLegacyNews(id);
 assert.deepEqual(s.shown,[]);
 assert.deepEqual(s.notifications,[{text:'יש להשלים תוכן ותמונה',bad:true}]);
 await s.context.window.publishLegacyNews(id);
 assert.equal(s.calls.length,2,'An error releases the local busy guard so it can be retried');
});

test('legacy create and edit navigate to the modern content/image editor without writing data',async()=>{
 const s=await setup(['news.review']);
 s.context.window.newNews();s.context.window.editNews(s.item);
 const created=new URL(s.navigation[0]),edited=new URL(s.navigation[1]);
 assert.equal(created.pathname,'/4545-app/admin/news');assert.equal(created.searchParams.get('club'),club);assert.equal(created.searchParams.get('new'),'1');
 assert.equal(edited.searchParams.get('club'),club);assert.equal(edited.searchParams.get('edit'),id);
 assert.equal(s.calls.length+s.writes.length,0);
 assert.ok(!source.includes("select('status'"),'Legacy news no longer exposes an arbitrary publication status dropdown');
});

test('published and unprivileged legacy rows cannot run publication or editing actions',async()=>{
 const published=await setup(['news.review','news.publish'],'published');
 assert.match(published.actions,/פתח באתר/);assert.doesNotMatch(published.actions,/onclick="publishLegacyNews/);
 await published.context.window.publishLegacyNews(id);assert.equal(published.calls.length,0);
 const viewer=await setup([]);viewer.context.window.newNews();viewer.context.window.editNews(viewer.item);await viewer.context.window.approveLegacyNews(id);
 assert.equal(viewer.navigation.length+viewer.calls.length+viewer.writes.length,0);
});
