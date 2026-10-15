"use strict";
/*
 * VO LAM IDLE - ADMINCP OFFLINE
 * Uses the actual character-state keys and real JX Hoang Kim set rows.
 * Intended exclusively for the offline build; disabled for online mode.
 */
(function(){
  if (window.VLIAdminCP && window.VLIAdminCP.installed) return;

  const VERSION = '12.1-horse';
  const LIMITS = {attrPts:1000000000, skPts:1000000000, knb:2000000000};
  const state = {tab:'points', faction:'', group:null, itemName:'', tier:'classic', qty:{attrPts:100,skPts:100,knb:10000},high:{kind:'gold',school:'mine',level:'all',q:'',page:0,selected:null,horseGrade:'all',horseRank:'best',horseVideo:false},visual:{level:'all',school:'mine'}};
  const cfg = {installed:true, version:VERSION, skill90Enabled:true};
  window.VLIAdminCP = cfg;
  const htmlEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatted = n => Number(n||0).toLocaleString('vi-VN');
  const el = id => document.getElementById(id);
  const isOffline = () => typeof NET_LOCAL !== 'undefined' && NET_LOCAL === true;
  const hasHero = () => typeof S !== 'undefined' && S && S.fac && typeof FAC !== 'undefined' && !!FAC[S.fac];
  const heroFac = () => hasHero() && typeof FAC[S.fac].id==='number' ? FAC[S.fac].id : -1;
  const clans = () => typeof FACTIONS !== 'undefined' ? FACTIONS.filter(f=>Number.isInteger(f.id)&&f.id>=0) : [];
  const rowFac = r => {
    const req=(r && r.req) || [];
    const a=req.find(p=>Array.isArray(p)&&p[0]===39);
    return a ? Number(a[1]) : -1;
  };
  const rowLvl = r => {
    const p=(r.req||[]).find(a=>a[0]===36);
    return p ? Math.max(1,Number(p[1])||1) : Math.max(1,r.lvl||1);
  };
  const groupLabel = rows => {
    const r=rows[0];
    if(!r)return 'Bộ Hoàng Kim';
    const names=rows.map(x=>String(x.n).split(/\s+/).filter(Boolean));
    let common=[];
    for(let i=0;i<3;i++){
      if(names.every(x=>x[i] && x[i]===names[0][i]))common.push(names[0][i]);else break;
    }
    return common.length?common.join(' '):names[0].slice(0,2).join(' ');
  };
  const itemSlotLabel = row => {
    const k=typeof DETAIL_SLOT!=='undefined' ? DETAIL_SLOT[row.d] : '';
    const names={weapon:'Vũ khí',armor:'Áo',helm:'Mũ',belt:'Đai',boot:'Giày',cuff:'Hộ uyển',amulet:'Dây chuyền',ring:'Nhẫn',pendant:'Ngọc bội',horse:'Ngựa'};
    return names[k]||'Trang bị';
  };

  const kindOfRow = row => typeof setRowOk==='function' && setRowOk(row) && (typeof hkmpOk!=='function' || hkmpOk(row)) ? 'classic':'extended';
  const validRow = row => !!row && Number.isInteger(row.d) && row.d>=0 && row.d<=10
    && Number.isInteger(row.grp) && !row.fixed && Array.isArray(row.base)
    && Array.isArray(row.ext) && Array.isArray(row.mag) && row.mag.length>0
    && Array.isArray(row.req) && typeof row.n==='string' && !!row.n.trim()
    && !(typeof eqBanned==='function' && eqBanned({n:row.n,set:{kind:'gold'}}));
  function availableRows(factionKey,tier='all'){
    const f=clans().find(x=>x.key===factionKey);
    if(!f || !window.JX || !JX.sets || !Array.isArray(JX.sets.gold))return [];
    return JX.sets.gold.filter(row=>validRow(row) && rowFac(row)===f.id && (tier==='all'||kindOfRow(row)===tier));
  }
  function groups(factionKey,tier='classic'){
    const m=new Map();
    for(const row of availableRows(factionKey,tier)){
      const key=String(row.grp);
      if(!m.has(key))m.set(key,[]);
      m.get(key).push(row);
    }
    return [...m.entries()].map(([key,rows])=>({key,rows,name:groupLabel(rows),lv:Math.min(...rows.map(rowLvl))}))
      .sort((a,b)=>a.lv-b.lv || Number(a.key)-Number(b.key));
  }
  function defaultTier(factionKey){return groups(factionKey,'classic').length?'classic':'extended';}
  function ensureSelection(){
    const fs=clans();
    if(!fs.length)return [];
    if(!fs.some(f=>f.key===state.faction))state.faction=fs.some(f=>f.key===S?.fac)?S.fac:fs[0].key;
    if(!groups(state.faction,state.tier).length)state.tier=defaultTier(state.faction);
    const g=groups(state.faction,state.tier);
    if(!g.some(x=>x.key===state.group))state.group=g.length?g[0].key:null;
    const rows=g.find(x=>x.key===state.group)?.rows||[];
    if(!rows.some(r=>r.n===state.itemName))state.itemName=rows[0]?.n||'';
    return g;
  }

  function renderLevel(){
    const hero=hasHero();
    const cur=hero?Math.max(1,Math.floor(Number(S.lvl)||1)):1;
    const cap=typeof levelCap==='function'?Math.min(200,levelCap()):200;
    const delta=hero?Math.max(0,cap-cur):0;
    const attrEach=typeof PTS_PER_LEVEL==='number'?PTS_PER_LEVEL:5;
    const skillEach=typeof SKILL_PTS_PER_LEVEL==='number'?SKILL_PTS_PER_LEVEL:1;
    const gainsAttr=delta*attrEach,gainsSkill=delta*skillEach;
    return `<section class="vliacp-level" aria-label="Lên thẳng cấp 200">
      <div class="vliacp-level-info"><div class="vliacp-title"><span class="vliacp-ico">⬆</span><div><b>CẤP NHÂN VẬT · TỐI ĐA 200</b><small>Lên thẳng cấp tối đa theo cơ chế Võ Lâm Idle, không mất trang bị và điểm đã cộng.</small></div></div>
      <div class="vliacp-level-stats"><span>Hiện tại <strong>${hero?cur:'—'}</strong></span><span>Đích <strong>200</strong></span><span>Tiềm năng <strong>+${formatted(gainsAttr)}</strong></span><span>Kỹ năng <strong>+${formatted(gainsSkill)}</strong></span></div></div>
      <button type="button" class="vliacp-primary amber vliacp-maxlv" id="vliacp-to-200" ${hero&&delta>0&&cap>=200?'':'disabled'}>${!hero?'CHƯA CÓ NHÂN VẬT':cur>=200?'ĐÃ ĐẠT CẤP 200':'⬆ LÊN CẤP 200'}</button>
    </section>`;
  }
  function renderPoints(){
    const items=[
      ['attrPts','Điểm tiềm năng','Cộng Sức mạnh, Thân pháp, Sinh khí và Nội công.','✧'],
      ['skPts','Điểm kỹ năng','Dùng để học và nâng cấp võ công môn phái.','⚔'],
      ['knb','Kim Nguyên Bảo','Dùng để mua vật phẩm Kỳ Trân Các, rèn đồ và nuôi ngựa.','◆']
    ];
    const hero=hasHero();
    return `<div class="vliacp-grid">${items.map(([key,title,desc,ico])=>`<section class="vliacp-card">
      <div class="vliacp-title"><span class="vliacp-ico">${ico}</span><div><b>${title}</b><small>${desc}</small></div></div>
      <div class="vliacp-value">Đang có <strong id="vliacp-has-${key}">${formatted(hero?S[key]:0)}</strong></div>
      <div class="vliacp-quicks">${[1,10,100,1000].map(n=>`<button type="button" data-vli-add="${key}" data-vli-qty="${n}" ${hero?'':'disabled'}>+${formatted(n)}</button>`).join('')}</div>
      <div class="vliacp-custom"><input id="vliacp-input-${key}" type="number" min="1" max="100000000" step="1" value="${state.qty[key]}" aria-label="Số lượng ${title}"><button type="button" class="vliacp-primary" data-vli-add="${key}" data-vli-custom="1" ${hero?'':'disabled'}>+ CỘNG</button></div>
    </section>`).join('')}</div>`;
  }
  function renderGold(){
    const fs=clans(),g=ensureSelection();
    const grp=g.find(x=>x.key===state.group),rows=grp?.rows||[];
    const hero=hasHero(),enough=hero && Array.isArray(S.inv) && S.inv.length < INV_MAX;
    const selected=rows.find(r=>r.n===state.itemName);
    const fac=fs.find(x=>x.key===state.faction);
    const info=(f)=>({classic:groups(f.key,'classic'),extended:groups(f.key,'extended')});
    const classicCount=groups(state.faction,'classic').length,extraCount=groups(state.faction,'extended').length;
    const facGrid=fs.map(f=>{
      const x=info(f),cnt=x.classic.length+x.extended.length;
      return `<button type="button" class="vliacp-faction-card ${f.key===state.faction?'selected':''}"
        data-vli-faction-card="${htmlEsc(f.key)}" aria-pressed="${f.key===state.faction}">
        <span class="vliacp-faction-mark">${f.series===0?'金':f.series===1?'木':f.series===2?'水':f.series===3?'火':'土'}</span>
        <span class="vliacp-faction-name"><b>${htmlEsc(f.n)}</b><small>${x.classic.length} bộ cổ điển · ${x.extended.length} bộ mở rộng</small></span>
        <span class="vliacp-faction-num">${cnt}</span></button>`;
    }).join('');
    return `<section class="vliacp-gold">
      <div class="vliacp-info"><b>ĐỦ ${fs.length} MÔN PHÁI · ĐỒ HOÀNG KIM THEO DỮ LIỆU GAME</b><br>
        Chọn môn phái → nhóm đồ cổ điển hoặc mở rộng → bộ → món. Bạn có thể tạo đồ cho phái khác, nhưng nhân vật vẫn phải đủ cấp, giới tính và môn phái mới trang bị được.</div>
      <div class="vliacp-all-factions">${facGrid}</div>
      <div class="vliacp-tierbar"><button type="button" data-vli-tier="classic" class="${state.tier==='classic'?'active':''}" ${classicCount?'':'disabled'}>Cổ điển (${classicCount} bộ)</button>
        <button type="button" data-vli-tier="extended" class="${state.tier==='extended'?'active':''}" ${extraCount?'':'disabled'}>Mở rộng (${extraCount} bộ)</button></div>
      <div class="vliacp-selects"><label>Môn phái<select id="vliacp-faction">${fs.map(f=>`<option value="${htmlEsc(f.key)}" ${f.key===state.faction?'selected':''}>${htmlEsc(f.n)}</option>`).join('')}</select></label>
      <label>Bộ Hoàng Kim<select id="vliacp-group">${g.length?g.map(x=>`<option value="${htmlEsc(x.key)}" ${x.key===state.group?'selected':''}>${htmlEsc(x.name)} · ${x.rows.length} món · cấp ${x.lv}</option>`).join(''):'<option>Không có bộ phù hợp</option>'}</select></label></div>
      ${g.length?`<div class="vliacp-summary"><b>${htmlEsc(fac?.n||'')}</b> · ${g.length} bộ · ${availableRows(state.faction,state.tier).length} món · <span>${htmlEsc(grp?.name||'')}</span></div>
      <div class="vliacp-gold-grid">${rows.map(r=>`<button type="button" class="vliacp-gold-item ${r.n===state.itemName?'selected':''}" data-vli-item="${htmlEsc(r.n)}"><span class="vliacp-mini-ico">✦${r.ic?`<img src="${htmlEsc(r.ic)}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}</span><span class="vliacp-item-name"><b>${htmlEsc(r.n)}</b><small>${itemSlotLabel(r)} · cấp ${rowLvl(r)} · ${['Kim','Mộc','Thủy','Hỏa','Thổ'][r.s]||'Không hệ'} · ${r.mag.length} dòng</small></span><span class="vliacp-tick">${r.n===state.itemName?'✓':''}</span></button>`).join('')}</div>
      <div class="vliacp-hint">${fac?.id===heroFac()?'Đồ thuộc phái hiện tại.':'Đồ phái khác sẽ được tạo vào hành trang và KHÔNG tự mặc.'}
         ${selected?`Đang chọn: <b>${htmlEsc(selected.n)}</b>.`:''} ${state.tier==='extended'?'<b>Nhóm mở rộng:</b> món được đánh dấu Admin để giữ trong bản lưu offline; không thay đổi bảng rơi đồ gốc.':''}</div>
      <div class="vliacp-actions"><button type="button" class="vliacp-primary" id="vliacp-create-one" ${enough&&selected?'':'disabled'}>✦ TẠO MÓN ĐÃ CHỌN</button>
        <button type="button" class="vliacp-primary amber" id="vliacp-create-set" ${hero&&grp&&S.inv.length+rows.length<=INV_MAX?'':'disabled'}>✦ TẠO TRỌN BỘ ${rows.length} MÓN</button></div>
      <div class="vliacp-note">Bộ và thuộc tính lấy từ bản dữ liệu Võ Lâm Idle bạn đã cung cấp. Vật phẩm được khóa để không tự bán. ${state.faction==='huashan'?'<b>Hoa Sơn:</b> game gốc có nhóm Hoàng Kim mở rộng trong dữ liệu nhưng không mở ở phiên bản hiện tại; AdminCP hỗ trợ riêng cho bản offline.':''}</div>`:
      `<div class="vliacp-note">Không có bộ hợp lệ trong nhóm này. Chọn nhóm khác hoặc môn phái khác.</div>`}
    </section>`;
  }

  // V7: The 130+ catalogue is available from AdminCP, not only a separate kiosk.
  const hiKinds={gold:'Ho&#224;ng Kim',platina:'B&#7841;ch Kim',horse:'Ng&#7921;a'};
  const hiCatalogue=()=>window.VLIHighGear130?.catalogue||[];
  // Names verifiable both in the uploaded V12 horse table and in the linked video
  // transcript. Do not invent video-only mounts without their source sprites.
  const videoHorses=new Set(['Xích Thố','Tuyệt ảnh','Ô Vân Đạp Tuyết',
    'Chiếu Dạ Ngọc Sư Tử','Bôn Tiêu','Phiên Vũ','Phi Vân','Xích Long Câu',
    'Siêu Quang','Du Huy','Ngự Phong','Dương Sa','Truy điện','Lưu Tinh',
    'Kim Tinh Bạch Hổ Vương','Hỏa Tinh Kim Hổ Vương','Kim Tinh Hổ Vương',
    'Long Tinh Hắc Hổ Vương','Sư tử'].map(s=>s.toLocaleLowerCase('vi')));
  function highRows(){
    const h=state.high,schoolId=h.school==='mine'?heroFac():Number(h.school);
    const query=h.q.trim().toLocaleLowerCase('vi');
    let rows=hiCatalogue().filter(e=>e.kind===h.kind &&
       (h.level==='all'||e.requiredLevel===Number(h.level)) &&
       (h.kind==='horse'||h.school==='all'||h.school==='mine'&&(e.schoolId<0||e.schoolId===schoolId)||
        h.school==='common'&&e.schoolId<0||
        h.school!=='mine'&&h.school!=='all'&&h.school!=='common'&&e.schoolId===schoolId) &&
       (!query||e.name.toLocaleLowerCase('vi').includes(query)) &&
       (h.kind!=='horse'||h.horseGrade==='all'||(h.horseGrade==='pc'?(e.subtype>=33&&e.subtype<=75):String(e.quality)===String(h.horseGrade))) &&
       (h.kind!=='horse'||!h.horseVideo||videoHorses.has(e.name.toLocaleLowerCase('vi'))));
    if(h.kind==='horse'){
      if(h.horseRank==='best'){
        const uniques=new Map();
        for(const e of rows){
          const key=e.name.normalize('NFC').toLocaleLowerCase('vi');
          if(!uniques.has(key)||e.tier>uniques.get(key).tier)uniques.set(key,e);
        }
        rows=Array.from(uniques.values());
      }else if(h.horseRank!=='all')rows=rows.filter(e=>e.tier===Number(h.horseRank));
      return rows.sort((a,b)=>a.quality-b.quality||a.requiredLevel-b.requiredLevel||a.name.localeCompare(b.name,'vi')||b.tier-a.tier);
    }
    return rows.sort((a,b)=>a.requiredLevel-b.requiredLevel||a.schoolId-b.schoolId||a.name.localeCompare(b.name,'vi'));
  }
  function highFamily(e){
    if(!e||e.kind==='horse')return [];
    return hiCatalogue().filter(x=>x.kind===e.kind&&x.group===e.group&&x.schoolId===e.schoolId&&x.requiredLevel===e.requiredLevel)
      .filter(x=>window.VLIHighGear130?.ready(x)).slice(0,30);
  }
  function renderHigh(){
    const h=state.high,all=hiCatalogue(),rows=highRows(),ready=e=>!!window.VLIHighGear130?.ready(e);
    const perPage=24,pages=Math.max(1,Math.ceil(rows.length/perPage));h.page=Math.max(0,Math.min(pages-1,h.page));
    if(!rows.some(e=>e.id===h.selected))h.selected=rows[0]?.id||null;
    const selected=rows.find(e=>e.id===h.selected),matched=selected&&window.VLIHighGear130?.match(selected);
    const family=highFamily(selected),canCreate=hasHero()&&selected&&ready(selected)&&S.inv.length<INV_MAX;
    const canFamily=hasHero()&&family.length>1&&S.inv.length+family.length<=INV_MAX;
    const schools=clans();
    const horseQuality=window.VLIHighGear130?.qualityNames||['Thường','Tốt','Quý','Thần','Danh mã','Bảo mã','Chí tôn'];
    const horseLevels=[...new Set(all.filter(e=>e.kind==='horse').map(e=>e.requiredLevel))].sort((a,b)=>a-b);
    const option=(value,label,sel)=>`<option value="${htmlEsc(value)}" ${String(value)===String(sel)?'selected':''}>${label}</option>`;
    const counts=Object.keys(hiKinds).map(k=>`${hiKinds[k]} ${all.filter(e=>e.kind===k).length}`).join(' &middot; ');
    return `<section class="vliacp-high" id="vliacp-high">
      <div class="vliacp-info"><b>KHO TRANG BỊ 130–180 VÀ MÃ TRƯỜNG</b><br>
        ${counts}. ${h.kind==='horse'?'Danh mục ngựa và thú cưỡi lấy từ bảng dữ liệu của V12. Tạo ngựa trực tiếp vào hành trang, có thể đưa vào Mã Trường.':'Trang bị Hoàng Kim và Bạch Kim giữ nguyên dữ liệu gốc. Vẫn cần đủ điều kiện để mặc.'}</div>
      <div class="vliacp-tierbar">${Object.entries(hiKinds).map(([k,label])=>`<button type="button" data-hi-kind="${k}" class="${h.kind===k?'active':''}">${label} (${all.filter(x=>x.kind===k).length})</button>`).join('')}</div>
      <div class="vliacp-selects vliacp-high-filters">
        ${h.kind==='horse'?`<label>Phẩm ngựa <select id="vliacp-horse-grade">${option('all','Tất cả phẩm',h.horseGrade)}${horseQuality.map((q,i)=>option(i,q,h.horseGrade)).join('')}${option(-1,'Khác / mở rộng',h.horseGrade)}${option('pc','PC mở rộng (43)',h.horseGrade)}</select></label>
        <label>Bậc ngựa <select id="vliacp-horse-rank">${option('best','Mỗi loài: bậc cao nhất',h.horseRank)}${option('all','Hiện tất cả bậc',h.horseRank)}${Array.from({length:10},(_,i)=>option(i+1,'Bậc '+(i+1),h.horseRank)).join('')}</select></label>`:`<label>Môn phái <select id="vliacp-high-school">${option('mine','Phái của tôi + đồ chung',h.school)}${option('all','Tất cả phái',h.school)}${option('common','Đồ dùng chung',h.school)}${schools.map(f=>option(f.id,htmlEsc(f.n),h.school)).join('')}</select></label>`}
        <label>Cấp yêu cầu <select id="vliacp-high-level">${option('all',h.kind==='horse'?'Mọi cấp ngựa':'Tất cả 130+',h.level)}${(h.kind==='horse'?horseLevels:[130,140,150,160,170,180]).map(n=>option(n,'Cấp '+n,h.level)).join('')}</select></label>
        <label class="vliacp-high-search">Tìm tên <input id="vliacp-high-q" type="search" value="${htmlEsc(h.q)}" placeholder="${h.kind==='horse'?'Ô Vân, Phiên Vũ, Ngự Phong…':'Nhập tên trang bị…'}"></label>
        ${h.kind==='horse'?`<label class="vliacp-horse-video"><input type="checkbox" id="vliacp-horse-video" ${h.horseVideo?'checked':''}> Trùng tên ngựa trong video tham chiếu</label>`:''}
      </div>
      <div class="vliacp-summary"><b>${rows.length}</b> m&#243;n &#273;&#250;ng b&#7897; l&#7885;c &middot; Trang ${h.page+1}/${pages} &middot; ${rows.filter(ready).length} m&#243;n c&#243; th&#7875; t&#7841;o</div>
      <div class="vliacp-high-grid">${rows.slice(h.page*perPage,(h.page+1)*perPage).map(e=>`
        <button type="button" class="vliacp-high-item ${h.selected===e.id?'selected':''}" data-hi-id="${htmlEsc(e.id)}" title="${htmlEsc(e.name)}">
          <img src="${htmlEsc(e.icon||'')}" alt="" loading="lazy" onerror="this.style.opacity=.15">
          <span><b>${htmlEsc(e.name)}</b><small>Cấp ${e.requiredLevel} · ${e.kind==='horse'?'Bậc '+e.tier+' · '+(horseQuality[e.quality]||'Mở rộng'):itemSlotLabel({d:e.detail})} ${ready(e)?'':'· Chưa hỗ trợ'}</small></span>
        </button>`).join('')||'<div class="vliacp-note">Kh&#244;ng c&#243; trang b&#7883; ph&#249; h&#7907;p.</div>'}</div>
      <div class="vliacp-actions vliacp-high-pager"><button id="vliacp-hi-prev" ${h.page===0?'disabled':''}> &larr; Trang tr&#432;&#7899;c</button><button id="vliacp-hi-next" ${h.page>=pages-1?'disabled':''}>Trang sau &rarr;</button></div>
      ${selected?`<div class="vliacp-high-selected">
        <img src="${htmlEsc(selected.icon||'')}" alt="">
        <div><b>${htmlEsc(selected.name)}</b><p>${hiKinds[selected.kind]} · Cấp ${selected.requiredLevel} · ${selected.kind==='horse'?'Bậc '+selected.tier+' · '+(horseQuality[selected.quality]||'Thú cưỡi mở rộng'):'Môn phái '+htmlEsc(schools.find(f=>f.id===selected.schoolId)?.n||'Chung')+' · Nhóm '+(selected.group??'-')}</p>
        <small>${matched&&ready(selected)?(selected.kind==='horse'?'Dữ liệu ngựa có trong game V12; có thể tạo và cưỡi khi đủ cấp.':'Đã đối chiếu với dữ liệu JXWEB; có thể tạo.'):'Dữ liệu chưa đủ để tạo vật phẩm hợp lệ.'} ${matched?' &middot; '+(matched.mag?.length||0)+' d&#242;ng ma ph&#225;p':''}</small></div></div>
        <div class="vliacp-actions"><button type="button" id="vliacp-hi-create" class="vliacp-primary" ${canCreate?'':'disabled'}>+ T&#7840;O M&#211;N V&#192;O H&#192;NH TRANG</button>
        <button type="button" id="vliacp-hi-family" class="vliacp-primary amber" ${canFamily?'':'disabled'}>+ T&#7840;O C&#7842; NH&#211;M (${family.length} m&#243;n)</button></div>`:''}
      <p class="vliacp-note">AdminCP cho ph&#233;p t&#7841;o &#273;&#7891; &#273;&#7875; th&#7917; nghi&#7879;m k&#7875; c&#7843; khi c&#7845;p hi&#7879;n t&#7841;i th&#7845;p. Game v&#7851;n ki&#7875;m tra c&#7845;p, gi&#7899;i t&#237;nh v&#224; m&#244;n ph&#225;i khi m&#7863;c. V&#7853;t ph&#7849;m t&#7841;o &#273;&#432;&#7907;c kh&#243;a v&#224; l&#432;u offline.</p>
    </section>`;
  }
  function createHighEntries(ids){
    if(!isOffline()||!hasHero()||!window.VLIHighGear130?.adminGrantBatch)return showStatus('Can bo du lieu trang bi 130+ de tao.',false),false;
    const result=window.VLIHighGear130.adminGrantBatch(ids);
    if(!result?.ok)return showStatus('Khong tao duoc: '+(result?.error||'du lieu hoac hanh trang khong hop le'),false),false;
    showStatus('AdminCP đã tạo '+result.items.length+' '+(result.items[0]?.d===10?'ngựa / thú cưỡi':'món trang bị')+' vào hành trang.');
    render();return true;
  }
  function skillRows(){
    const v=state.visual,schoolId=v.school==='mine'?heroFac():Number(v.school);
    return [...Array.from({length:10},(_,i)=>708+i),...Array.from({length:25},(_,i)=>751+i)]
      .map(id=>typeof SK!=='undefined'?SK[id]:null).filter(Boolean)
      .filter(s=>(v.level==='all'||s.req===Number(v.level)) &&
        (v.school==='all'||v.school==='mine'&&typeof FAC!=='undefined'&&FAC[s.f]?.id===schoolId||v.school!=='all'&&v.school!=='mine'&&typeof FAC!=='undefined'&&FAC[s.f]?.id===schoolId));
  }
  function renderVisual(){
    const vis=state.visual,skills=skillRows(),schools=clans();
    const selected=skills.find(s=>s.id===vis.selected)||skills[0];
    vis.selected=selected?.id||null;
    return `<section class="vliacp-skill-audit" id="vliacp-skill-audit">
      <div class="vliacp-info"><b>K&#7928; N&#258;NG 120 / 150 &#8211; ICON &amp; HO&#7840;T &#7842;NH</b><br>
      35 icon ch&#237;nh t&#7915; g&#243;i JXWEB V4. K&#7929; n&#259;ng 150 &#273;&#432;&#7907;c gh&#233;p hi&#7879;u &#7913;ng sprite JXWEB; c&#225;c k&#7929; n&#259;ng 120 ch&#7911; y&#7871;u l&#224; h&#7895; tr&#7907; / b&#7883; &#273;&#7897;ng v&#224; kh&#244;ng c&#243; &#273;&#7911; FX g&#7889;c &#273;&#7875; &#273;&#7843;m b&#7843;o gi&#7889;ng tuy&#7879;t &#273;&#7889;i.</div>
      <div class="vliacp-selects"><label>C&#7845;p k&#7929; n&#259;ng<select id="vliacp-vis-level">${['all','120','150'].map(x=>`<option value="${x}" ${vis.level===x?'selected':''}>${x==='all'?'120 v&#224; 150':x}</option>`).join('')}</select></label>
      <label>M&#244;n ph&#225;i<select id="vliacp-vis-school"><option value="all" ${vis.school==='all'?'selected':''}>T&#7845;t c&#7843;</option><option value="mine" ${vis.school==='mine'?'selected':''}>Ph&#225;i c&#7911;a t&#244;i</option>${schools.map(f=>`<option value="${f.id}" ${vis.school===String(f.id)?'selected':''}>${htmlEsc(f.n)}</option>`).join('')}</select></label></div>
      <div class="vliacp-vis-list">${skills.map(s=>`<button type="button" class="vliacp-vis-skill ${s.id===vis.selected?'selected':''}" data-vis-id="${s.id}"><img src="${htmlEsc(s.ic||'img/s/'+s.id+'.png')}" alt="" loading="lazy"><span><b>${htmlEsc(s.n)}</b><small>ID ${s.id} &middot; C&#7845;p ${s.req} &middot; ${htmlEsc(clans().find(f=>f.key===s.f)?.n||s.f||'')}</small></span></button>`).join('')||'<p>Kh&#244;ng c&#243; k&#7929; n&#259;ng.</p>'}</div>
      ${selected?`<div class="vliacp-vis-selected"><img src="${htmlEsc(selected.ic||'img/s/'+selected.id+'.png')}" alt=""><div><b>${htmlEsc(selected.n)}</b><p>${htmlEsc(selected.d||'')}</p><small>${Number(selected.id)>=751?'FX JXWEB 150: c&#243; th&#7875; xem th&#7917; trong b&#7843;n &#273;&#7891;.':'C&#7845;p 120: hi&#7879;u &#7913;ng &#273;&#432;&#7907;c chuy&#7875;n th&#7875; theo engine offline; kh&#244;ng kh&#7859;ng &#273;&#7883;nh gi&#7889;ng FX JXWEB 100%.'}</small></div></div>
       <div class="vliacp-actions"><button type="button" id="vliacp-preview-fx" class="vliacp-primary" ${hasHero()&&selected.id>=751?'':'disabled'}>XEM TH&#7916; HI&#7878;U &#7912;NG 150 (KH&#212;NG G&#194;Y S&#193;T TH&#431;&#416;NG)</button></div>`:''}
      <p class="vliacp-note">Icon &#273;&#432;&#7907;c g&#7855;n theo ID g&#7889;c c&#7911;a k&#7929; n&#259;ng. N&#7871;u tr&#236;nh duy&#7879;t c&#242;n hi&#7875;n th&#7883; h&#236;nh c&#361;, b&#7845;m Ctrl + Shift + R sau khi c&#224;i v&#225;.</p>
    </section>`;
  }
  function previewVisualFx(){
    const id=Number(state.visual.selected),skill=typeof SK!=='undefined'?SK[id]:null;
    if(!isOffline()||!hasHero()||id<751||id>775||!skill||typeof skillFx!=='function'||!R||!H)return false;
    closeModal(true);
    const to={x:H.x+Math.min(200,Math.max(80,(WORLD?.w||1000)-H.x-35)),y:H.y-28,r:18,hp:99999};
    const before=R.fx?.length||0;
    try{skillFx(H,to,skill);if((R.fx?.length||0)===before){showStatus('Ky nang nay khong co FX tan cong truc tiep.');return false;}
      showStatus('Da phat thu FX '+skill.n+' trong ban do, khong tru noi luc.');return true;
    }catch(e){console.warn('[AdminCP V7] FX preview failed',e);showStatus('Khong the xem FX: '+e.message,false);return false;}
  }

  function render(){
    const hero=hasHero();
    const body=`<div class="vliacp" id="vliacp-root"><div class="vliacp-head"><span class="vliacp-seal">令</span><div><small>VÕ LÂM IDLE · OFFLINE · PHIÊN BẢN ADMINCP ${VERSION}</small><h2>ADMIN CONTROL PANEL</h2><p>${hero?`Nhân vật: <b>${htmlEsc(S.name||FAC[S.fac].n)}</b> · ${htmlEsc(FAC[S.fac].n)} · cấp ${S.lvl} · Hành trang ${S.inv.length}/${INV_MAX}`:'Chưa có nhân vật — hãy tạo nhân vật trước khi dùng AdminCP'}</p></div></div>
    <div class="vliacp-tabs"><button type="button" class="${state.tab==='points'?'on':''}" data-vli-tab="points">✧ TIỀM NĂNG · KỸ NĂNG · KNB</button><button type="button" class="${state.tab==='gold'?'on':''}" data-vli-tab="gold">✦ TẠO ĐỒ HOÀNG KIM MÔN PHÁI</button><button type="button" class="${state.tab==='high'?'on':''}" data-vli-tab="high">&#10022; TRANG B&#7882; 130+</button><button type="button" class="${state.tab==='visual'?'on':''}" data-vli-tab="visual">&#9889; K&#7928; N&#258;NG 120/150</button></div>
    ${!isOffline()?'<p class="vliacp-warning">AdminCP chỉ hoạt động trong bản offline. Chế độ mạng đã được vô hiệu hóa.</p>':!hero?'<p class="vliacp-warning">Hãy tạo hoặc chọn nhân vật trước khi cộng điểm và tạo trang bị.</p>':''}
    ${state.tab==='gold'?renderGold():state.tab==='high'?renderHigh():state.tab==='visual'?renderVisual():renderLevel()+renderPoints()}
    <footer class="vliacp-foot"><span>Điểm và vật phẩm sẽ được lưu vào nhân vật trên máy của bạn, không thay đổi tài khoản trực tuyến.</span><button type="button" id="vliacp-to-inv" ${hero?'':'disabled'}>Mở hành trang</button><button type="button" id="vliacp-close">Đóng</button></footer></div>`;
    if(typeof modal !=='function')return;
    modal(body,bindEvents);
  }
  function showStatus(msg,ok=true){
    if(typeof toast==='function')toast(msg);
    if(typeof log==='function' && ok)log(`<span style="color:#ffdb84">[AdminCP]</span> ${htmlEsc(msg)}`);
  }
  function commit(msg){
    try{
      if(typeof R!=='undefined' && R)R.dirty=true;
      if(typeof invDirty!=='undefined')invDirty=true;
      if(typeof recalc==='function')recalc();
      if(typeof refresh==='function')refresh();
      if(typeof updateTop==='function')updateTop();
      if(typeof save==='function')save();
      showStatus(msg);
      render();
      return true;
    }catch(e){console.error('[AdminCP] Lỗi cập nhật',e);showStatus('Thay đổi đã thực hiện nhưng làm mới giao diện có lỗi: '+e.message,false);return false;}
  }
  // Use the game's own level-up rewards and cap, without replaying 199 level-up
  // callbacks (which would unnecessarily flood the UI and open dialogs).
  function levelTo200(){
    if(!isOffline() || !hasHero())return showStatus('Chỉ lên cấp khi đang chơi offline và có nhân vật.',false),false;
    const cap=typeof levelCap==='function'?levelCap():200;
    if(cap<200)return showStatus('Dữ liệu game chưa hỗ trợ cấp 200.',false),false;
    const from=Math.max(1,Math.floor(Number(S.lvl)||1));
    if(from>=200)return showStatus('Nhân vật đã đạt cấp 200.',false),false;
    const delta=200-from;
    const attrEach=typeof PTS_PER_LEVEL==='number'?PTS_PER_LEVEL:5;
    const skillEach=typeof SKILL_PTS_PER_LEVEL==='number'?SKILL_PTS_PER_LEVEL:1;
    const gainedAttr=delta*attrEach, gainedSkill=delta*skillEach;
    const newAttr=(Number(S.attrPts)||0)+gainedAttr;
    const newSkill=(Number(S.skPts)||0)+gainedSkill;
    if(!Number.isSafeInteger(newAttr)||!Number.isSafeInteger(newSkill))return showStatus('Điểm đang có vượt giới hạn lưu trữ.',false),false;
    S.lvl=200;
    S.xp=0; // Full-level XP is not used; prevents a stale overfilled XP bar.
    S.attrPts=newAttr;
    S.skPts=newSkill;
    if(typeof R!=='undefined'&&R)R.dirty=true;
    // Trigger normal map / reward / stats refresh once, not on each skipped level.
    if(typeof onLevelUp==='function'){
      try{onLevelUp();}catch(e){console.warn('[AdminCP] Không thể đồng bộ sự kiện lên cấp',e);}
    }
    return commit(`Đã lên cấp 200 (từ cấp ${from}); nhận +${formatted(gainedAttr)} tiềm năng và +${formatted(gainedSkill)} kỹ năng.`);
  }
  function grant(key,amount){
    if(!isOffline() || !hasHero())return showStatus('Chỉ dùng khi chơi offline và đã có nhân vật.',false),false;
    if(!Object.prototype.hasOwnProperty.call(LIMITS,key))return false;
    const n=Number(amount);
    if(!Number.isSafeInteger(n) || n<1 || n>100000000)return showStatus('Nhập số nguyên từ 1 đến 100.000.000.',false),false;
    const cur=Number(S[key])||0, max=LIMITS[key];
    if(cur+n>max)return showStatus('Giới hạn '+formatted(max)+' '+key+'. Hãy nhập số nhỏ hơn.',false),false;
    S[key]=cur+n;
    return commit(`Đã cộng +${formatted(n)} ${key==='attrPts'?'điểm tiềm năng':key==='skPts'?'điểm kỹ năng':'Kim Nguyên Bảo'}.`);
  }
  // Independently cross-check an Admin-created item against its original row.
  // Unlike a simple boolean flag, every name, school, slot and stat ID must match.
  function verifyAdminItem(item,row){
    if(!item || !row || !row.n || item.n!==row.n || item.r!==4 ||
       item.vliAdminGold!==1 || item.set?.kind!=='gold' ||
       item.set.grp!==row.grp || item.d!==row.d || item.k!==row.k ||
       item.s!==row.s || !Array.isArray(item.req) || !Array.isArray(item.mag) ||
       item.mag.length!==row.mag.length || !Array.isArray(item.base) ||
       item.base.length!==row.base.length ||
       !Array.isArray(JX?.sets?.gold) || !JX.sets.gold.includes(row) ||
       !validRow(row) || rowFac(row)<0 ||
       (typeof setBanned==='function' && setBanned(item.n)))return false;
    const norm=n=>n===65?66:n===70?71:n;
    if(!row.req.every(p=>item.req.some(q=>q[0]===p[0] && q[1]===p[1])))return false;
    return row.mag.every((id,i)=>JX.ge[id] && item.mag[i] &&
       norm(item.mag[i].a)===norm(JX.ge[id].a) && Array.isArray(item.mag[i].p));
  }
  // Full-page HTML can sometimes be cached with an older setfix script.
  // Restore validation strictly from the JX catalogue, never accept unknown items.
  function repairMissingGoldValidator(item,row){
    if(!verifyAdminItem(item,row))return false;
    if(typeof window.VLI_ADMIN_GOLD_OK==='function' && window.VLI_ADMIN_GOLD_OK(item))return true;
    window.VLI_ADMIN_GOLD_OK=function(it){
      if(!it || !Array.isArray(JX?.sets?.gold))return false;
      const src=JX.sets.gold.find(r=>r && !r.fixed && r.n===it.n &&
           r.grp===it.set?.grp && r.d===it.d && r.k===it.k && r.s===it.s);
      return !!src && verifyAdminItem(it,src);
    };
    return !!window.VLI_ADMIN_GOLD_OK(item);
  }
  function createItems(rows){
    if(!isOffline() || !hasHero())return showStatus('Chỉ tạo đồ khi đang chơi offline và đã có nhân vật.',false),false;
    if(!Array.isArray(rows) || !rows.length || rows.length>30)return showStatus('Không có trang bị hợp lệ.',false),false;
    const allowed=new Set(availableRows(state.faction,'all'));
    if(rows.some(r=>!allowed.has(r)))return showStatus('Trang bị không nằm trong danh sách Hoàng Kim môn phái hợp lệ.',false),false;
    if(S.inv.length+rows.length>INV_MAX)return showStatus('Hành trang không đủ ô trống. Hãy dọn bớt đồ trước.',false),false;
    const uid=S.uid;
    let items=[];
    try{
      if(typeof makeSetItem!=='function')throw new Error('Thiếu hệ thống tạo đồ Hoàng Kim.');
      items=rows.map(row=>{
        const it=makeSetItem('gold',row,6);
        if(!it || it.r!==4 || it.set?.kind!=='gold' || !Array.isArray(it.mag) || !it.mag.length)throw new Error('Vật phẩm không đủ cấu trúc thuộc tính: '+row.n);
        // V5 always applies catalogue-backed Admin validation to ALL Admin-created items,
        // including routes whose family classifier changed between versions. Never trust
        // arbitrary names, unrecognised row IDs, or modified magic stats.
        it.vliAdminGold=1;
        if(!repairMissingGoldValidator(it,row))throw new Error('Dữ liệu Hoàng Kim không hợp lệ: '+row.n);
        if(typeof eqBanned==='function' && eqBanned(it))throw new Error('Vật phẩm đã bị loại: '+row.n);
        // The legacy game's eqRemoved sometimes rejects a real catalogue row when its
        // set family is tagged as advanced. The signed, row-verified Admin item is valid.
        if(typeof eqRemoved==='function' && eqRemoved(it) && !verifyAdminItem(it,row))
          throw new Error('Vật phẩm không còn được game hỗ trợ: '+row.n);
        it.lock=true;
        return it;
      });
    }catch(e){S.uid=uid;console.warn('[AdminCP] Tạo trang bị thất bại',e);showStatus(e.message,false);return false;}
    S.inv.unshift(...items);
    return commit(items.length===1?`Đã tạo Hoàng Kim: ${items[0].n}.`:`Đã tạo đủ ${items.length} món Hoàng Kim · ${groupLabel(rows)}.`);
  }
  function bindEvents(){
    const root=el('vliacp-root');if(!root)return;
    for(const b of root.querySelectorAll('[data-vli-tab]'))b.addEventListener('click',()=>{state.tab=b.dataset.vliTab;render()});
    for(const b of root.querySelectorAll('[data-vli-add]'))b.addEventListener('click',()=>{
      const key=b.dataset.vliAdd;
      if(b.dataset.vliCustom){
        const input=el('vliacp-input-'+key);
        const val=Number(input?.value);
        if(input)state.qty[key]=val;
        grant(key,val);
      }else grant(key,Number(b.dataset.vliQty));
    });
    const levelButton=el('vliacp-to-200');
    if(levelButton)levelButton.addEventListener('click',()=>{
      const from=Math.max(1,Number(S?.lvl)||1);
      if(from>=200)return;
      const attr=(200-from)*(typeof PTS_PER_LEVEL==='number'?PTS_PER_LEVEL:5);
      const skill=(200-from)*(typeof SKILL_PTS_PER_LEVEL==='number'?SKILL_PTS_PER_LEVEL:1);
      if(window.confirm(`Đưa nhân vật từ cấp ${from} lên cấp 200?\nNhận thêm ${formatted(attr)} tiềm năng và ${formatted(skill)} kỹ năng.\nTrang bị và điểm hiện tại sẽ được giữ nguyên.`))levelTo200();
    });
    const chooseFaction=f=>{state.faction=f;state.group=null;state.itemName='';state.tier=defaultTier(f);render()};
    const f=el('vliacp-faction');if(f)f.addEventListener('change',()=>chooseFaction(f.value));
    for(const b of root.querySelectorAll('[data-vli-faction-card]'))b.addEventListener('click',()=>chooseFaction(b.dataset.vliFactionCard));
    for(const b of root.querySelectorAll('[data-vli-tier]'))b.addEventListener('click',()=>{state.tier=b.dataset.vliTier;state.group=null;state.itemName='';render()});
    const g=el('vliacp-group');if(g)g.addEventListener('change',()=>{state.group=g.value;state.itemName='';render()});
    for(const b of root.querySelectorAll('[data-vli-item]'))b.addEventListener('click',()=>{state.itemName=b.dataset.vliItem;render()});
    const one=el('vliacp-create-one');if(one)one.addEventListener('click',()=>{
      const rows=groups(state.faction,state.tier).find(x=>x.key===state.group)?.rows||[];
      const row=rows.find(x=>x.n===state.itemName);
      createItems(row?[row]:[]);
    });
    const full=el('vliacp-create-set');if(full)full.addEventListener('click',()=>{
      const rows=groups(state.faction,state.tier).find(x=>x.key===state.group)?.rows||[];
      createItems(rows);
    });
    // V7 high-gear actions are scoped to the AdminCP modal.
    const high=state.high;
    for(const b of root.querySelectorAll('[data-hi-kind]'))b.addEventListener('click',()=>{high.kind=b.dataset.hiKind;high.level='all';high.q='';high.page=0;high.selected=null;render();});
    for(const [id,key] of [['vliacp-high-school','school'],['vliacp-high-level','level']]){
      const node=el(id);if(node)node.addEventListener('change',()=>{high[key]=node.value;high.page=0;high.selected=null;render();});
    }
    for(const [id,key] of [['vliacp-horse-grade','horseGrade'],['vliacp-horse-rank','horseRank']]){
      const node=el(id);if(node)node.addEventListener('change',()=>{high[key]=node.value;high.page=0;high.selected=null;render();});
    }
    const video=el('vliacp-horse-video');if(video)video.addEventListener('change',()=>{high.horseVideo=!!video.checked;high.page=0;high.selected=null;render();});
    const search=el('vliacp-high-q');if(search){
      const apply=()=>{high.q=search.value;high.page=0;high.selected=null;render();};
      search.addEventListener('change',apply);
      search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}});
    }
    for(const b of root.querySelectorAll('[data-hi-id]'))b.addEventListener('click',()=>{high.selected=b.dataset.hiId;render();});
    for(const [id,n] of [['vliacp-hi-prev',-1],['vliacp-hi-next',1]]){const b=el(id);if(b)b.addEventListener('click',()=>{high.page+=n;render();});}
    const hiCreate=el('vliacp-hi-create');if(hiCreate)hiCreate.addEventListener('click',()=>createHighEntries([high.selected]));
    const hiFamily=el('vliacp-hi-family');if(hiFamily)hiFamily.addEventListener('click',()=>{
      const entry=hiCatalogue().find(x=>x.id===high.selected);const members=highFamily(entry);
      if(members.length>1&&window.confirm('Tao '+members.length+' mon trang bi cua cung mot bo vao hanh trang?'))createHighEntries(members.map(e=>e.id));
    });
    const vis=state.visual;
    for(const [id,key] of [['vliacp-vis-level','level'],['vliacp-vis-school','school']]){
      const b=el(id);if(b)b.addEventListener('change',()=>{vis[key]=b.value;vis.selected=null;render();});
    }
    for(const b of root.querySelectorAll('[data-vis-id]'))b.addEventListener('click',()=>{vis.selected=Number(b.dataset.visId);render();});
    const testFx=el('vliacp-preview-fx');if(testFx)testFx.addEventListener('click',previewVisualFx);
    const inv=el('vliacp-to-inv');if(inv)inv.addEventListener('click',()=>{closeModal(true);if(typeof showTab==='function')showTab('inv');});
    const close=el('vliacp-close');if(close)close.addEventListener('click',()=>closeModal(true));
  }
  function open(){
    if(!isOffline())return showStatus('AdminCP chỉ dùng trong bản offline.',false);
    ensureSelection();render();
  }
  function boot(){
    if(!document.getElementById('top'))return;
    let b=el('vliacp-open');
    if(!b){
      b=document.createElement('button');b.id='vliacp-open';b.type='button';b.title='AdminCP offline: Lên cấp 200, cộng điểm, Kim Nguyên Bảo và tạo đồ Hoàng Kim';
      b.innerHTML='⚜ <span>AdminCP</span>';
      const bar=el('top');const anchor=el('giftBtn');
      if(anchor&&anchor.parentElement===bar)anchor.insertAdjacentElement('afterend',b);
      else if(bar)bar.appendChild(b);
    }
    b.addEventListener('click',open);
    // In desktop UI 2.0 the original #top is hidden. Add an independent
    // control to the visible bottom-right u20 icon dock once it is created.
    const dockButton=()=>{
      const dock=el('u20menu');
      if(!dock)return false;
      if(el('vliacp-u20'))return true;
      const x=document.createElement('button');
      x.id='vliacp-u20';x.type='button';x.className='u20mi';
      x.title='AdminCP offline · Cấp 200 / Điểm / KNB / Hoàng Kim (Alt+Shift+A)';
      x.setAttribute('aria-label','Mở AdminCP offline');
      x.textContent='令';
      x.addEventListener('click',open);
      dock.appendChild(x);
      return true;
    };
    if(!dockButton()){
      let tries=0;
      const handle=setInterval(()=>{if(dockButton()||++tries>=20)clearInterval(handle);},250);
    }
    document.addEventListener('keydown',ev=>{
      if(ev.altKey && ev.shiftKey && ev.key.toLowerCase()==='a' && !ev.repeat && !ev.ctrlKey && !ev.metaKey){ev.preventDefault();open();}
    });
  }
  cfg.open=open;
  cfg.levelTo200=levelTo200;
  cfg.grant=grant;
  cfg.createItems=createItems;
  cfg.getRows=availableRows;
  cfg.getHighRows=highRows;
  cfg.getHighFamily=highFamily;
  cfg.createHigh130=createHighEntries;
  cfg.getSkillRows=skillRows;
  cfg.previewVisualFx=previewVisualFx;
  cfg.getGroups=groups;
  cfg.getFactions=()=>clans().map(f=>({key:f.key,name:f.n,classical:groups(f.key,'classic').length,extended:groups(f.key,'extended').length}));
  cfg.selectFaction=(key,tier)=>{
    if(!clans().some(f=>f.key===key))return false;
    state.faction=key;state.tier=['classic','extended'].includes(tier)?tier:defaultTier(key);
    state.group=null;state.itemName='';ensureSelection();return true;
  };
  cfg.isAdminGoldItem=(it)=>!!(window.VLI_ADMIN_GOLD_OK&&window.VLI_ADMIN_GOLD_OK(it));
  cfg.verifyAdminItem=verifyAdminItem;
  cfg.skill90Enabled=true;
  cfg.offline=isOffline;
  cfg.getStatus=()=>({version:VERSION,offline:isOffline(),hero:hasHero(),faction:state.faction,availableGroups:groups(state.faction,state.tier).length,tier:state.tier});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
