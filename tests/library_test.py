import importlib.util, pathlib, tempfile, unittest
spec=importlib.util.spec_from_file_location('library', pathlib.Path(__file__).resolve().parents[1]/'local_library/service.py')
lib=importlib.util.module_from_spec(spec);spec.loader.exec_module(lib)

class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.original=(lib.ROOT,lib.DATABASE)
        lib.ROOT=pathlib.Path(self.temp.name)
        lib.DATABASE=lib.ROOT/'index.sqlite'
        lib.init()
    def tearDown(self):
        lib.ROOT,lib.DATABASE=self.original
        self.temp.cleanup()
    def row(self):
        with lib.connect() as db:return db.execute('SELECT * FROM documents WHERE present=1').fetchone()
    def test_changes_removals_and_search(self):
        file=lib.ROOT/'数学二导数.txt'
        file.write_text('导数定义描述瞬时变化率，使用差商的极限理解切线斜率。先检查函数是否在该点连续，再判断是否可导。',encoding='utf8')
        lib.scan();lib.index_document(self.row())
        hits=lib.search('导数定义')
        self.assertEqual(hits[0]['page'],1)
        self.assertEqual(hits[0]['quality'],'text')
        file.write_text('虚拟内存利用页表将虚拟地址映射到物理地址。缺页异常需要操作系统参与处理，不能与缓存未命中混为一谈。',encoding='utf8')
        lib.scan()
        self.assertEqual(lib.search('导数定义'),[]) # old indexed content invalidated immediately
        lib.index_document(self.row())
        self.assertEqual(lib.search('虚拟内存')[0]['page'],1)
        file.unlink();lib.scan()
        self.assertEqual(lib.search('虚拟内存'),[])
    def test_scope_and_paths(self):
        self.assertEqual(lib.classify(pathlib.Path('数学三真题.pdf'))[2],0)
        self.assertEqual(lib.classify(pathlib.Path('计算机/操作系统.pdf'))[0],'操作系统')
        with self.assertRaises(ValueError):lib.safe_file('../outside.pdf')
    def test_scan_and_review_quality(self):
        file=lib.ROOT/'数学二.txt';file.write_text('1',encoding='utf8');lib.scan()
        row=self.row();lib.index_document(row)
        self.assertEqual(self.row()['status'],'needs_ocr')
        self.assertEqual(lib.search('数学二')[0]['quality'],'filename_only')
        with lib.connect() as db:db.execute("UPDATE pages SET text='人工校正文字',quality='ocr_reviewed' WHERE doc=?",(row['id'],))
        lib.put_page(row['id'],1,'1',row['title'],row['mtime'])
        with lib.connect() as db:self.assertEqual(db.execute('SELECT quality FROM pages').fetchone()[0],'ocr_reviewed')
        self.assertFalse(lib.put_page(row['id'],1,'stale text',row['title'],row['mtime']+1))

if __name__=='__main__':unittest.main()

