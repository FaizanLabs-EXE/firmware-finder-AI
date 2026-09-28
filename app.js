(()=>{const $=id=>document.getElementById(id),S={key:sessionStorage.getItem('fv_key')||'',models:[],results:[]},OR='https://openrouter.ai/api/v1',FREE='openrouter/free';function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}function activity(a,b){$('activity').innerHTML='<b>'+esc(a)+'</b><span>'+esc(b)+'</span>'}function heads(){return {'Authorization':'Bearer '+S.key,'Content-Type':'application/json','HTTP-Referer':location.href,'X-Title':'FirmwareVault AI'}}async function or(path,opt={}){const r=await fetch(OR+path,{...opt,headers:{...heads(),...(opt.headers||{})}}),t=await r.text();let d;try{d=JSON.parse(t)}catch{d={error:{message:t}}}if(!r.ok)throw Error(d?.error?.message||'OpenRouter HTTP '+r.status);return d}async function freeModels(){const d=await or('/models'),a=(d.data||[]).filter(m=>Number(m.pricing?.prompt)===0&&Number(m.pricing?.completion)===0).map(m=>m.id).filter(Boolean);S.models=a.slice(0,14);$('freeCount').textContent=S.models.length+' free models';$('aiModel').textContent='openrouter/free';return S.models}async function connect(){const k=$('apiKey').value.trim();if(!/^sk-or-/i.test(k))return alert('Enter an OpenRouter key beginning with sk-or-.');$('connect').disabled=true;try{S.key=k;await freeModels();sessionStorage.setItem('fv_key',k);$('keyState').textContent='CONNECTED';$('keyState').className='state on';$('connect').textContent='Connected ✓';activity('AI ready',S.models.length+' currently free models detected.')}catch(e){S.key='';sessionStorage.removeItem('fv_key');$('keyState').textContent='FAILED';$('connect').textContent='Connect AI';alert('OpenRouter connection failed: '+e.message)}finally{$('connect').disabled=false}}function norm(s){return String(s||'').toLowerCase().replace(/[_\-./]+/g,' ').replace(/\s+/g,' ').trim()}function candidate(x,m){const t=norm([x.title,x.name,x.description,x.url,x.format].join(' ')),ts=norm(m).split(' ').filter(x=>x.length>1),hit=ts.filter(z=>t.includes(z)).length,fw=/firmware|stock rom|factory image|flash file|flashable|firmware package|official rom|update package|full ota|fastboot|odin|scatter|flashtool/i.test(t),ext=/\.(zip|7z|rar|tar|gz|bin|img|iso|ipsw|kdz|dz|ofp|pac|mbn|md5|tgz|payload)(?:$|[?#\s])/i.test(t),junk=/review|wallpaper|driver|manual|specifications|specs|news|youtube|video|repair guide|price|case|cover|accessor/i.test(t);return hit>=1&&(fw||ext)&&!junk}async function discover(brand,model){const out=[],q=encodeURIComponent('"'+model+'" firmware');try{const r=await fetch('https://api.github.com/search/repositories?q='+encodeURIComponent(model+' firmware')+'&sort=updated&order=desc&per_page=30',{headers:{Accept:'application/vnd.github+json'}});if(r.ok){const d=await r.json();(d.items||[]).forEach(x=>out.push({source:'GitHub',sourceUrl:x.html_url,url:x.html_url,title:x.full_name,name:x.name,description:x.description||'',format:'repository'}))}}catch{}try{const r=await fetch('https://archive.org/advancedsearch.php?q='+encodeURIComponent('"'+model+'" AND (firmware OR rom OR "flash file")')+'&fl[]=identifier&fl[]=title&fl[]=description&fl[]=format&fl[]=publicdate&rows=40&output=json');if(r.ok){const d=await r.json();(d.response?.docs||[]).forEach(x=>{const id=x.identifier;out.push({source:'Internet Archive',sourceUrl:'https://archive.org/details/'+encodeURIComponent(id),url:'https://archive.org/details/'+encodeURIComponent(id),title:x.title||id,name:x.title||id,description:x.description||'',format:Array.isArray(x.format)?x.format.join(', '):String(x.format||'')})})}}catch{}try{const r=await fetch('https://html.duckduckgo.com/html/?q='+q);if(r.ok){const h=await r.text(),d=new DOMParser().parseFromString(h,'text/html');d.querySelectorAll('.result').forEach(e=>{const a=e.querySelector('.result__a');if(a)out.push({source:'Web index',sourceUrl:a.href,url:a.href,title:a.textContent.trim(),name:a.textContent.trim(),description:e.querySelector('.result__snippet')?.textContent.trim()||'',format:'web'})})}}catch{}const seen=new Set;return out.filter(x=>candidate(x,model)).filter(x=>{const k=(x.url||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,80)}function prompt(q,c){return `You are the STRICT firmware-file verification engine. Return JSON only.\nUSER: brand=${q.brand}; exact model=${q.model}; region/CSC=${q.region||'not specified'}; carrier=${q.carrier||'not specified'}; desired=${q.kind}.\nAccept ONLY a candidate that is plausibly an actual firmware/download package for THIS exact device, OR a source page clearly containing such a package. Reject reviews, news, specs, manuals, drivers, videos, accessories, generic repositories and unrelated variants. Do not invent URLs, filenames, versions, builds, hashes or regions. Model-number precision is more important than brand similarity. If region is supplied, prefer an exact match; otherwise use unknown. Output exactly: {"matches":[{"candidateIndex":number,"firmware":true,"confidence":0-100,"reason":"short factual reason","fileType":"zip|7z|rar|bin|img|iso|ipsw|kdz|dz|ofp|pac|md5|tar|tgz|other|unknown","modelMatch":"exact|partial|unknown","regionMatch":"exact|partial|unknown","build":"","version":""}]}\nCANDIDATES:\n${c.map((x,i)=>`[${i}] ${x.source} | ${x.title} | ${x.url} | ${String(x.description||'').slice(0,600)} | ${x.format||''}`).join('\n')}`}async function verify(q,c){
  if(!S.models.length) await freeModels();
  if(!c.length) return [];

  // HARD LIMIT: primary + at most 2 fallback models = 3 total.
  // We rotate through multiple batches instead of sending a huge fallback array.
  const pool=[];
  const seen=new Set();
  [FREE,...S.models].forEach(id=>{
    if(id&&!seen.has(id)){seen.add(id);pool.push(id)}
  });

  const rounds=Math.min(4,Math.ceil(pool.length/3)||1);
  let last;

  for(let round=0;round<rounds;round++){
    const batch=pool.slice(round*3,round*3+3);
    if(!batch.length) break;

    const primary=batch[0];
    const fallbacks=batch.slice(1,3);

    try{
      activity('AI verifying candidates',
        'Rotation '+(round+1)+'/'+rounds+' • '+batch.join(' → '));

      const body={
        model:primary,
        temperature:0,
        max_tokens:2200,
        messages:[
          {role:'system',content:'Deterministic firmware verification classifier. JSON only.'},
          {role:'user',content:prompt(q,c)}
        ]
      };

      // Never send more than TWO fallback entries.
      // primary + fallback1 + fallback2 = MAXIMUM 3 models.
      if(fallbacks.length) body.models=fallbacks;

      const d=await or('/chat/completions',{
        method:'POST',
        body:JSON.stringify(body)
      });

      const txt=d.choices?.[0]?.message?.content||'';
      const cleaned=txt.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
      const j=JSON.parse(cleaned);

      const matches=(j.matches||[])
        .filter(x=>x.firmware===true&&Number(x.confidence)>=72)
        .map(x=>({...x,aiModel:d.model||primary,rotation:round+1}));

      if(matches.length) return matches;
      last=Error('AI returned no firmware candidate above the confidence threshold.');
    }catch(e){
      last=e;
    }
  }

  throw last||Error('All free AI model routes failed');
}
function render(ms,c){S.results=ms.map(m=>({...c[m.candidateIndex],...m}));$('cards').innerHTML='';$('copyAll').disabled=!S.results.length;if(!S.results.length){activity('No exact firmware passed the AI gate','Try the complete model code, CSC/region or another variant.');$('resultTitle').textContent='No verified firmware';return}activity(S.results.length+' firmware candidate'+(S.results.length===1?'':'s')+' verified','Only firmware candidates meeting the strict AI threshold are shown.');$('resultTitle').textContent=S.results.length+' verified firmware result'+(S.results.length===1?'':'s');const t=$('tpl');S.results.forEach(r=>{const c=t.content.cloneNode(true);c.querySelector('.source').textContent=r.source||'Public';c.querySelector('.conf').textContent=r.confidence+'% AI confidence';c.querySelector('.name').textContent=r.title||r.name||'Firmware package';c.querySelector('.desc').textContent=r.reason||'Passed firmware verification.';c.querySelector('.meta').textContent=[String(r.fileType||'').toUpperCase(),r.version&&'Version '+r.version,r.build&&'Build '+r.build,r.modelMatch&&'Model '+r.modelMatch,r.regionMatch&&'Region '+r.regionMatch].filter(Boolean).join(' • ');[r.model,r.region,r.carrier,r.aiModel].filter(Boolean).forEach(x=>{const s=document.createElement('span');s.className='chip';s.textContent=x;c.querySelector('.chips').appendChild(s)});c.querySelector('.download').href=r.url||'#';c.querySelector('.source').href=r.sourceUrl||r.url||'#';c.querySelector('.copy').onclick=async()=>{try{await navigator.clipboard.writeText(r.url);c.querySelector('.copy').textContent='Copied ✓';setTimeout(()=>c.querySelector('.copy').textContent='Copy',1200)}catch{prompt('Copy URL',r.url)}};$('cards').appendChild(c)})}async function find(){if(!S.key){alert('Connect your OpenRouter API key first.');return}const q={brand:$('brand').value.trim(),model:$('model').value.trim(),region:$('region').value.trim(),carrier:$('carrier').value.trim(),kind:$('kind').value};if(!q.brand||!q.model)return;$('cards').innerHTML='';$('resultTitle').textContent='Finding '+q.brand+' '+q.model;try{activity('Discovering public firmware candidates','Checking GitHub, Internet Archive and best-effort web-index candidates.');const c=await discover(q.brand,q.model);$('candidateCount').textContent=c.length+' candidates';if(!c.length)return activity('No firmware-like public candidates found','Try the exact model code.');const m=await verify(q,c);render(m,c)}catch(e){activity('Firmware search failed',e.message+' • Check key, browser network access and model availability.')}}$('connect').onclick=connect;$('toggleKey').onclick=()=>{$('apiKey').type=$('apiKey').type==='password'?'text':'password';$('toggleKey').textContent=$('apiKey').type==='password'?'Show':'Hide'};$('finderForm').onsubmit=e=>{e.preventDefault();find()};document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const [a,m]=b.dataset.q.split('|');$('brand').value=a;$('model').value=m;find()});$('theme').onclick=()=>document.body.classList.toggle('light');$('copyAll').onclick=async()=>{const t=S.results.map(x=>x.url).filter(Boolean).join('\n');try{await navigator.clipboard.writeText(t);$('copyAll').textContent='Copied ✓';setTimeout(()=>$('copyAll').textContent='Copy verified links',1200)}catch{prompt('Verified links',t)}};$('submitForm').onsubmit=e=>{e.preventDefault();const u=$('sUrl').value.trim();$('submitOut').textContent=/^https?:\/\//i.test(u)&&!/login|signin|checkout|subscribe|paywall|premium/i.test(u)?'Submission captured locally. Configure the optional Apps Script endpoint in the README to publish it to a shared index.':'Only public HTTP(S) firmware links are accepted.'};(async()=>{if(S.key){$('apiKey').value=S.key;try{await freeModels();$('keyState').textContent='CONNECTED';$('keyState').className='state on';$('connect').textContent='Connected ✓'}catch{sessionStorage.removeItem('fv_key');S.key=''}}})();})();
