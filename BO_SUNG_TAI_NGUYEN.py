#!/usr/bin/env python3
"""Downloads only catalogued static assets from an authorized website. No account data."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import json,urllib.request,urllib.error,time,threading,random,os
BASE='https://volamidle.pages.dev/'
ROOT=Path(__file__).resolve().parent
DATA=json.loads((ROOT/'ASSET_MANIFEST.json').read_text('utf-8'))
print('TAI NGUYEN CON THIEU - VO LAM IDLE (can Internet va quyen su dung)')
print('1. Anh/chieu thuc/icon co ban: %d tap tin' % len(DATA['core']))
print('2. Toan bo, ke ca atlas trang bi/ngua: them %d tap tin; co the rat lau, rat nang' % len(DATA['extended']))
print('0. Huy')
choice=input('Chon 1/2/0: ').strip()
if choice not in ('1','2'): raise SystemExit('Khong tai.')
targets=list(DATA['core'])+(list(DATA['extended']) if choice=='2' else [])
seen=set(); todo=[]
for name in targets:
    if name in seen or name.startswith('/') or '..' in name or '\\' in name: continue
    seen.add(name)
    local=ROOT/name
    if local.is_file() and local.stat().st_size>200: continue
    todo.append(name)
print('Can tai:',len(todo),'tap tin. Nguon duy nhat:',BASE)
consent=input('Gõ CO để bắt đầu (chỉ dùng khi bạn có quyền sử dụng): ').strip().upper()
if consent!='CO':raise SystemExit('Huy')
lock=threading.Lock();count={'ok':0,'bad':0,'bytes':0}; fails=[]
def get(name):
    # Keep request rate and concurrent requests conservative.
    time.sleep(random.uniform(.05,.2))
    u=BASE+name
    for attempt in range(2):
        try:
            req=urllib.request.Request(u,headers={'User-Agent':'VoLamIdle-Authorized-Offline-Backup/1.0'})
            with urllib.request.urlopen(req,timeout=18) as r:
                kind=r.headers.get('Content-Type','').split(';')[0]
                if kind.startswith('text/html'):raise ValueError('HTML, khong phai asset')
                data=r.read(8*1024*1024+1)
                if len(data)<200 or len(data)>8*1024*1024:raise ValueError('size khong hop le')
            local=ROOT/name;local.parent.mkdir(parents=True,exist_ok=True)
            temp=local.with_name(local.name+'.part')
            temp.write_bytes(data);os.replace(temp,local)
            return name,len(data),None
        except urllib.error.HTTPError as e:
            if e.code in (403,404):return name,0,str(e.code)
            if attempt==1:return name,0,str(e)
        except Exception as e:
            if attempt==1:return name,0,str(e)
        time.sleep((attempt+1)*.6)
    return name,0,'unknown'
with ThreadPoolExecutor(max_workers=4) as pool:
    futs=[pool.submit(get,n) for n in todo]
    for i,fut in enumerate(as_completed(futs),1):
        name,n,err=fut.result()
        with lock:
            if err:count['bad']+=1;fails.append(name+': '+err)
            else:count['ok']+=1;count['bytes']+=n
            if i%50==0 or i==len(futs):print('Da kiem tra',i,'/',len(futs),'Thanh cong',count['ok'],'Loi',count['bad'], 'MB',round(count['bytes']/1048576,1),flush=True)
(ROOT/'BAO_CAO_TAI_BO_SUNG.txt').write_text('Tai thanh cong: '+str(count['ok'])+'\nKhong lay duoc: '+str(count['bad'])+'\n'+'\n'.join(fails),encoding='utf8')
print('Hoan tat. Chay lai game offline. Neu dung 1 file HTML, chay TAO_LAI_HTML_1_FILE.cmd')
