"""Local-only document index. Original files never become hosted site assets."""
import argparse, hashlib, io, json, os, pathlib, re, secrets, sqlite3, threading, time, urllib.parse, zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from xml.etree import ElementTree
import pypdfium2 as pdfium

ROOT = pathlib.Path(__file__).resolve().parents[2]
STATE = pathlib.Path(__file__).resolve().parents[1] / '.sites-runtime' / 'library'
STATE.mkdir(parents=True, exist_ok=True)
DATABASE = STATE / 'index.sqlite'
TOKEN_FILE = STATE / 'token'
if not TOKEN_FILE.exists(): TOKEN_FILE.write_text(secrets.token_hex(32), encoding='ascii')
TOKEN = TOKEN_FILE.read_text(encoding='ascii').strip()
PDF_LOCK = threading.Lock()
SCAN_LOCK = threading.Lock()
WAKE = threading.Event()
STOP = threading.Event()
CURRENT = {'file': '', 'page': 0, 'scanning': False, 'last_scan': 0, 'error': ''}
SUPPORTED = {'.pdf', '.docx', '.txt', '.md'}
IGNORE = {'gentle-tutor', 'docs', '.git', '.codex', '.agents', 'node_modules', '__pycache__'}

class ClosingConnection(sqlite3.Connection):
    def __exit__(self, *args):
        try: return super().__exit__(*args)
        finally: self.close()

def connect():
    db = sqlite3.connect(DATABASE, timeout=30, factory=ClosingConnection)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA journal_mode=WAL')
    return db

def init():
    with connect() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY, path TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
          subject TEXT NOT NULL, scope TEXT NOT NULL, size INTEGER, mtime INTEGER,
          pages INTEGER DEFAULT 0, processed INTEGER DEFAULT 0, text_pages INTEGER DEFAULT 0,
          status TEXT DEFAULT 'queued', enabled INTEGER DEFAULT 1, manual INTEGER DEFAULT 0,
          error TEXT DEFAULT '', present INTEGER DEFAULT 1, year INTEGER, updated INTEGER
        );
        CREATE TABLE IF NOT EXISTS pages (doc TEXT, page INTEGER, text TEXT NOT NULL, quality TEXT, PRIMARY KEY(doc,page));
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(doc UNINDEXED, page UNINDEXED, terms);
        CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(present,enabled,status);
        ''')
        db.execute("UPDATE documents SET status='queued' WHERE status='indexing'")

def classify(path):
    s = str(path)
    for word,subject in [('数据结构','数据结构'),('组成','计算机组成'),('操作系统','操作系统'),('计算机网络','计算机网络')]:
        if word in s: return subject,'408',1
    if '408' in s or s.startswith('计算机'): return '408综合','408',1
    if '概率' in path.name or '数理统计' in path.name: return '数学二','超纲/其他卷种',0
    s = re.sub(r'数[一二三123]?[、/和与]?二?[、/和与]?三|一二三|一、二、三', lambda m: '' if '二' in m.group() and '三' in m.group() else m.group(), s)
    if re.search(r'数学[一三13]|数[一三13]|无穷级数|傅里叶|空间解析几何|多元积分',s): return '数学二','超纲/其他卷种',0
    return '数学二','数学二/公共基础',1

def safe_file(relative):
    path=(ROOT / relative).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file(): raise ValueError('源文件不存在或路径无效')
    return path

def scan():
    if not SCAN_LOCK.acquire(blocking=False): return
    CURRENT['scanning']=True
    try:
        found=[]
        for folder,dirs,files in os.walk(ROOT):
            dirs[:]=[d for d in dirs if d not in IGNORE and not d.startswith('.') and not pathlib.Path(folder,d).is_symlink()]
            for name in files:
                p=pathlib.Path(folder,name)
                if p.suffix.lower() not in SUPPORTED or p.is_symlink(): continue
                stat=p.stat();relative=p.relative_to(ROOT).as_posix()
                subject,scope,enabled=classify(pathlib.Path(relative));identity=hashlib.sha256(relative.encode()).hexdigest()[:24]
                years=re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)',name)
                found.append((identity,relative,name,subject,scope,stat.st_size,stat.st_mtime_ns,enabled,int(years[0]) if years else None))
        with connect() as db:
            db.execute('UPDATE documents SET present=0')
            for identity,path,title,subject,scope,size,mtime,enabled,year in found:
                old=db.execute('SELECT * FROM documents WHERE id=?',(identity,)).fetchone()
                if old and old['size']==size and old['mtime']==mtime:
                    db.execute('UPDATE documents SET present=1 WHERE id=?',(identity,));continue
                if old:
                    db.execute('DELETE FROM pages WHERE doc=?',(identity,));db.execute('DELETE FROM search_index WHERE doc=?',(identity,))
                    if old['manual']: enabled=old['enabled']
                    db.execute("UPDATE documents SET size=?,mtime=?,pages=0,processed=0,text_pages=0,status=?,error='',present=1,enabled=?,updated=? WHERE id=?",(size,mtime,'queued' if enabled else 'excluded',enabled,int(time.time()),identity))
                else:
                    db.execute('INSERT INTO documents(id,path,title,subject,scope,size,mtime,enabled,year,status,present,updated) VALUES(?,?,?,?,?,?,?,?,?,?,1,?)',(identity,path,title,subject,scope,size,mtime,enabled,year,'queued' if enabled else 'excluded',int(time.time())))
            absent=[r[0] for r in db.execute('SELECT id FROM documents WHERE present=0')]
            for identity in absent:
                db.execute('DELETE FROM search_index WHERE doc=?',(identity,));db.execute('DELETE FROM pages WHERE doc=?',(identity,))
        CURRENT['last_scan']=int(time.time());CURRENT['error']='';WAKE.set()
    except Exception as e: CURRENT['error']=str(e)[:160]
    finally: CURRENT['scanning']=False;SCAN_LOCK.release()

def tokens(text):
    lower=text.lower();words=re.findall(r'[a-z0-9_]{2,}',lower)
    for part in re.findall(r'[\u3400-\u9fff]+',lower):
        words += [part[i:i+2] for i in range(len(part)-1)]
        if len(part)==1: words.append(part)
    return words[:14000]

def clean_snippet(text):
    text=re.sub(r'[\x00-\x1f\x7f-\x9f\uf000-\uf8ff\ufffd]',' ',text)
    text=re.sub(r'\s+',' ',text).strip()
    return text[:420]

def put_page(identity,page,text,title,expected_mtime=None):
    text=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',text).strip()[:30000]
    # A text layer with only page numbers is not a successfully recognized scan.
    quality='text' if len(re.findall(r'[\u3400-\u9fffA-Za-z]',text))>=30 else 'needs_ocr'
    with connect() as db:
        current=db.execute('SELECT mtime,enabled,present FROM documents WHERE id=?',(identity,)).fetchone()
        if not current or not current['enabled'] or not current['present'] or expected_mtime is not None and current['mtime']!=expected_mtime:return False
        prior=db.execute('SELECT quality FROM pages WHERE doc=? AND page=?',(identity,page)).fetchone()
        if prior and prior['quality']=='ocr_reviewed':
            db.execute('UPDATE documents SET processed=max(processed,?) WHERE id=?',(page,identity));return True
        db.execute('INSERT OR REPLACE INTO pages(doc,page,text,quality) VALUES(?,?,?,?)',(identity,page,text,quality))
        db.execute('DELETE FROM search_index WHERE doc=? AND page=?',(identity,page))
        if quality=='text': db.execute('INSERT INTO search_index(doc,page,terms) VALUES(?,?,?)',(identity,page,' '.join(tokens(title+' '+text))))
        db.execute('UPDATE documents SET processed=max(processed,?),text_pages=(SELECT count(*) FROM pages WHERE doc=? AND quality IN (\'text\',\'ocr_reviewed\')) WHERE id=?',(page,identity,identity))
    return True

def index_document(row):
    identity=row['id'];CURRENT['file']=row['title'];CURRENT['page']=row['processed']
    with connect() as db: db.execute("UPDATE documents SET status='indexing' WHERE id=?",(identity,))
    try:
        path=safe_file(row['path'])
        if path.suffix.lower()=='.pdf':
            with PDF_LOCK: pdf=pdfium.PdfDocument(path);count=len(pdf)
            with connect() as db: db.execute('UPDATE documents SET pages=? WHERE id=?',(count,identity))
            try:
                for i in range(row['processed'],count):
                    if STOP.is_set(): return
                    with PDF_LOCK:
                        page=pdf[i];textpage=page.get_textpage()
                        try: text=textpage.get_text_range()
                        finally: textpage.close();page.close()
                    if not put_page(identity,i+1,text,row['title'],row['mtime']):return
                    CURRENT['page']=i+1
                    if i%30==0:
                        with connect() as db:
                            state=db.execute('SELECT enabled,present,mtime FROM documents WHERE id=?',(identity,)).fetchone()
                        if not state or not state['enabled'] or not state['present'] or state['mtime']!=row['mtime']: return
                    time.sleep(.002)
            finally:
                with PDF_LOCK: pdf.close()
        else:
            if path.suffix.lower()=='.docx':
                with zipfile.ZipFile(path) as z:
                    xml=ElementTree.fromstring(z.read('word/document.xml'))
                    text='\n'.join(''.join(p.itertext()) for p in xml.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
            else: text=path.read_text(encoding='utf-8-sig',errors='replace')
            pieces=[text[i:i+6000] for i in range(0,len(text),6000)] or ['']
            for i,piece in enumerate(pieces):
                if not put_page(identity,i+1,piece,row['title'],row['mtime']):return
            with connect() as db: db.execute('UPDATE documents SET pages=? WHERE id=?',(len(pieces),identity))
        with connect() as db:
            state=db.execute('SELECT pages,text_pages FROM documents WHERE id=?',(identity,)).fetchone()
            status='text' if state['text_pages']==state['pages'] else 'partial' if state['text_pages'] else 'needs_ocr'
            db.execute('UPDATE documents SET status=?,updated=? WHERE id=? AND enabled=1 AND present=1 AND mtime=?',(status,int(time.time()),identity,row['mtime']))
    except Exception as e:
        with connect() as db: db.execute("UPDATE documents SET status='error',error=? WHERE id=? AND mtime=? AND enabled=1 AND present=1",(str(e)[:200],identity,row['mtime']))
    finally: CURRENT['file']='';CURRENT['page']=0

def worker():
    while not STOP.is_set():
        with connect() as db:
            row=db.execute("SELECT * FROM documents WHERE present=1 AND enabled=1 AND status='queued' ORDER BY CASE WHEN title LIKE '%考纲%' THEN 0 WHEN subject<>'数学二' THEN 1 WHEN path LIKE '考研数学通用教材/%' THEN 2 WHEN path LIKE '%数学二%' OR path LIKE '%数二%' THEN 3 ELSE 4 END,size LIMIT 1").fetchone()
        if row: index_document(row)
        else: WAKE.wait(3);WAKE.clear()

def watcher():
    while not STOP.wait(60): scan()

def document_dict(row):
    value=dict(row);value['year_inferred']=value['year'] is not None;value['source_confidence']='本地用户资料；文件名推断信息需核对原页';return value

def search(query,subject='',limit=6):
    query=query.strip()[:200];terms=list(dict.fromkeys(tokens(query)))[:18]
    if not terms: return []
    where='d.present=1 AND d.enabled=1';params=[]
    if subject:
        where+=' AND (d.subject=? OR d.subject=?)'
        params.extend([subject,'408综合' if subject in ['数据结构','计算机组成','操作系统','计算机网络'] else subject])
    match=' OR '.join('"'+t.replace('"','')+'"' for t in terms)
    with connect() as db:
        rows=db.execute(f'''SELECT d.*,p.page,p.text,p.quality,bm25(search_index) AS rank FROM search_index
        JOIN documents d ON d.id=search_index.doc JOIN pages p ON p.doc=d.id AND p.page=search_index.page
        WHERE search_index MATCH ? AND {where} ORDER BY rank LIMIT ?''',[match,*params,limit*4]).fetchall()
        scored=[]
        for row in rows:
            text=row['text'];score=sum(1 for t in terms if t in text.lower())+ (10 if query in text else 0)
            indexes=[text.lower().find(t) for t in terms if t in text.lower()];pos=max(0,min(indexes or [0])-60)
            item={'id':row['id'],'title':row['title'],'path':row['path'],'page':row['page'],'subject':row['subject'],'snippet':clean_snippet(text[pos:pos+420]),'quality':'text','extraction':row['quality'],'year':row['year'],'year_inferred':True,'number':None,'exam':'待核对','confidence':'本地资料，题号与出处需核对','source':'local','score':score}
            scored.append(item)
        scored.sort(key=lambda x:x['score'],reverse=True)
        if not scored:
            names=db.execute(f'SELECT d.* FROM documents d WHERE {where} AND title LIKE ? LIMIT ?',[*params,'%'+query+'%',limit]).fetchall()
            return [{'id':r['id'],'title':r['title'],'path':r['path'],'page':1,'subject':r['subject'],'snippet':'文件名匹配；尚无可用文本页，请打开原页或执行按页 OCR。','quality':'filename_only','confidence':'仅文件名，不作为内容证据','source':'local','year':r['year']} for r in names]
        unique=[];seen=set()
        for item in scored:
            fingerprint=re.sub(r'\s+','',item['snippet'])
            if fingerprint in seen: continue
            seen.add(fingerprint);unique.append(item)
        return unique[:limit]

class Handler(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def log_message(self,*args): pass
    def authorized(self):
        return secrets.compare_digest(self.headers.get('X-Library-Token',''),TOKEN) and self.client_address[0]=='127.0.0.1'
    def send_json(self,value,status=200):
        raw=json.dumps(value,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        if not self.authorized(): return self.send_json({'error':'仅允许授权的本地工作台访问'},403)
        try:
            url=urllib.parse.urlparse(self.path);q=urllib.parse.parse_qs(url.query);one=lambda name,default='':q.get(name,[default])[0]
            if url.path=='/status':
                with connect() as db:
                    counts={r[0]:r[1] for r in db.execute('SELECT status,count(*) FROM documents WHERE present=1 GROUP BY status')}
                    totals=dict(db.execute('SELECT count(*) AS documents,sum(pages) AS pages,sum(processed) AS processed,sum(text_pages) AS text_pages,sum(size) AS bytes FROM documents WHERE present=1').fetchone())
                return self.send_json({'connected':True,'counts':counts,'totals':totals,'current':CURRENT,'root':str(ROOT),'privacy':'所有原文件与页码索引保留本机'})
            if url.path=='/documents':
                where=['present=1'];params=[]
                for key in ['subject','status']:
                    if one(key): where.append(key+'=?');params.append(one(key))
                if one('q'): where.append('(title LIKE ? OR path LIKE ?)');params += ['%'+one('q')[:100]+'%']*2
                offset=max(0,int(one('offset','0')))
                with connect() as db:
                    total=db.execute('SELECT count(*) FROM documents WHERE '+' AND '.join(where),params).fetchone()[0]
                    rows=db.execute('SELECT * FROM documents WHERE '+' AND '.join(where)+' ORDER BY enabled DESC,subject,title LIMIT 40 OFFSET ?',[*params,offset]).fetchall()
                return self.send_json({'documents':[document_dict(r) for r in rows],'total':total,'offset':offset})
            if url.path=='/search': return self.send_json({'results':search(one('q'),one('subject'),min(12,max(1,int(one('limit','6')))))})
            if url.path in ['/file','/page']:
                with connect() as db: row=db.execute('SELECT * FROM documents WHERE id=? AND present=1',(one('id'),)).fetchone()
                if not row: return self.send_json({'error':'本地源文件不存在'},404)
                path=safe_file(row['path'])
                if url.path=='/page':
                    if path.suffix.lower()!='.pdf': return self.send_json({'error':'此文件不是 PDF'},400)
                    number=int(one('page','1'))
                    with PDF_LOCK:
                        pdf=pdfium.PdfDocument(path)
                        try:
                            if not 1<=number<=len(pdf): return self.send_json({'error':'页码超出范围'},400)
                            page=pdf[number-1];bitmap=page.render(scale=min(1.5,1400/max(page.get_size())))
                            try: image=bitmap.to_pil();buf=io.BytesIO();image.save(buf,format='PNG');raw=buf.getvalue()
                            finally: bitmap.close();page.close()
                        finally: pdf.close()
                    self.send_response(200);self.send_header('Content-Type','image/png');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw);return
                size=path.stat().st_size;start=0;end=size-1;status=200
                range_header=self.headers.get('Range','')
                if range_header:
                    match=re.fullmatch(r'bytes=(\d+)-(\d*)',range_header)
                    if not match: return self.send_json({'error':'不支持此范围请求'},416)
                    start=int(match[1]);end=min(size-1,int(match[2])) if match[2] else size-1
                    if start>end: return self.send_json({'error':'文件范围无效'},416)
                    status=206
                self.send_response(status);self.send_header('Content-Type','application/pdf' if path.suffix.lower()=='.pdf' else 'application/octet-stream');self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-store');self.send_header('Content-Disposition',"inline; filename*=UTF-8''"+urllib.parse.quote(path.name))
                if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
                self.end_headers()
                with path.open('rb') as f:
                    f.seek(start);remaining=end-start+1
                    while remaining:
                        chunk=f.read(min(65536,remaining))
                        if not chunk:break
                        self.wfile.write(chunk);remaining-=len(chunk)
                return
            return self.send_json({'error':'接口不存在'},404)
        except (BrokenPipeError,ConnectionResetError): pass
        except Exception as e: self.send_json({'error':str(e)[:200]},400)
    def do_POST(self):
        if not self.authorized(): return self.send_json({'error':'仅允许授权的本地工作台访问'},403)
        try:
            url=urllib.parse.urlparse(self.path);size=int(self.headers.get('Content-Length','0'))
            if url.path=='/refresh':
                self.rfile.read(min(size,1000));threading.Thread(target=scan,daemon=True).start();return self.send_json({'ok':True})
            if url.path=='/import':
                name=urllib.parse.parse_qs(url.query).get('name',[''])[0]
                if pathlib.Path(name).name!=name or any(c in name for c in '<>:"/\\|?*') or pathlib.Path(name).suffix.lower() not in SUPPORTED: return self.send_json({'error':'不支持此文件名或格式'},400)
                if not 0<size<=300_000_000:return self.send_json({'error':'单个导入文件限制 300 MB；更大文件请直接放入项目目录'},413)
                target=ROOT/'知识库导入'/name;target.parent.mkdir(exist_ok=True)
                if target.exists():return self.send_json({'error':'同名文件已存在，请改名或在本机手动更新后刷新'},409)
                try:
                    with target.open('xb') as f:
                        remaining=size
                        while remaining:
                            part=self.rfile.read(min(65536,remaining))
                            if not part:raise ValueError('文件未完整上传')
                            f.write(part);remaining-=len(part)
                except Exception:
                    if target.exists():target.unlink()
                    raise
                threading.Thread(target=scan,daemon=True).start();return self.send_json({'ok':True,'name':name})
            if size>90000:return self.send_json({'error':'请求过大'},413)
            body=json.loads(self.rfile.read(size) or b'{}')
            if url.path=='/ocr':
                identity=body.get('id');page=body.get('page');text=body.get('text')
                if body.get('confirmed') is not True or not isinstance(page,int) or not isinstance(text,str) or not 30<=len(text)<=20000:return self.send_json({'error':'请校正识别内容后确认，文字长度需在 30–20000 字之间'},400)
                with connect() as db:
                    row=db.execute('SELECT * FROM documents WHERE id=? AND present=1',(identity,)).fetchone()
                    if not row or not 1<=page<=row['pages']:return self.send_json({'error':'文件或页码无效'},400)
                    db.execute('INSERT OR REPLACE INTO pages(doc,page,text,quality) VALUES(?,?,?,?)',(identity,page,text,'ocr_reviewed'))
                    db.execute('DELETE FROM search_index WHERE doc=? AND page=?',(identity,page))
                    db.execute('INSERT INTO search_index(doc,page,terms) VALUES(?,?,?)',(identity,page,' '.join(tokens(row['title']+' '+text))))
                    count=db.execute("SELECT count(*) FROM pages WHERE doc=? AND quality IN ('text','ocr_reviewed')",(identity,)).fetchone()[0]
                    status='text' if count==row['pages'] else 'partial'
                    db.execute('UPDATE documents SET text_pages=?,status=CASE WHEN status IN (\'queued\',\'indexing\',\'excluded\') THEN status ELSE ? END WHERE id=?',(count,status,identity))
                return self.send_json({'ok':True,'page':page})
            if url.path=='/document':
                with connect() as db:
                    row=db.execute('SELECT * FROM documents WHERE id=? AND present=1',(body.get('id'),)).fetchone()
                    if not row:return self.send_json({'error':'记录不存在'},404)
                    if body.get('reindex'):
                        if row['status']=='indexing':return self.send_json({'error':'该文件正在提取，请等待当前文件完成再重新提取'},409)
                        db.execute("DELETE FROM search_index WHERE doc=? AND page NOT IN (SELECT page FROM pages WHERE doc=? AND quality='ocr_reviewed')",(row['id'],row['id']))
                        db.execute("DELETE FROM pages WHERE doc=? AND quality<>'ocr_reviewed'",(row['id'],));db.execute("UPDATE documents SET processed=0,text_pages=(SELECT count(*) FROM pages WHERE doc=?),status='queued',enabled=1,manual=1,error='' WHERE id=?",(row['id'],row['id']))
                    else:
                        enabled=1 if body.get('enabled') is True else 0
                        status='queued' if enabled and row['status']=='excluded' else row['status'] if enabled else 'excluded'
                        db.execute('UPDATE documents SET enabled=?,manual=1,status=? WHERE id=?',(enabled,status,row['id']))
                WAKE.set();return self.send_json({'ok':True})
            return self.send_json({'error':'接口不存在'},404)
        except Exception as e:return self.send_json({'error':str(e)[:200]},400)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--scan-only',action='store_true');args=parser.parse_args();init();scan()
    if args.scan_only:
        with connect() as db: print(json.dumps({'documents':db.execute('SELECT count(*) FROM documents WHERE present=1').fetchone()[0]},ensure_ascii=False))
    else:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
        threading.Thread(target=worker,daemon=True).start();threading.Thread(target=watcher,daemon=True).start()
        print(f'Local knowledge library: http://127.0.0.1:{args.port} (authenticated, local files only)',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:STOP.set();server.shutdown()
