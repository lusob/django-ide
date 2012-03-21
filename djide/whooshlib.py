''' 
Library to fulltext search inside source files

Example of use
import whooshlib
whooshlib.index_my_docs('.', False)
for hit in whooshlib.find('.','prueba'):
    print(hit["path"])
    print(hit.highlights("content"))
'''

import os
import fnmatch
from whoosh import index
from whoosh.fields import Schema, ID, TEXT, STORED

def clean_index(dirname, index_dir, index_name):
    # Always create the index from scratch
    ix = index.create_in(index_dir, indexname=index_name, schema=get_schema())
    writer = ix.writer()

    # Assume we have a function that gathers the filenames of the
    # documents to be indexed
    for root, dirnames, filenames in os.walk(dirname):
        for filename in filenames:
            if filename.endswith(('.py','.html','.php','.js')):
                py_file = (os.path.join(root, filename))
                add_doc(writer, py_file)
    writer.commit()

def get_schema():
    return Schema(path=ID(unique=True, stored=True), time=STORED, content=TEXT(stored=True))

def add_doc(writer, path):
    fileobj=open(path, "rb")
    content=fileobj.read()
    fileobj.close()
    modtime = os.path.getmtime(path)
    writer.add_document(path=path, content=unicode(content, errors='ignore'), time=modtime)


def index_my_docs(dirname, index_path_file, clean=False):
    index_name = os.path.basename(index_path_file)
    index_dir = os.path.dirname(index_path_file)
    if clean:
        clean_index(dirname, index_dir, index_name)
    else:
        try:
            incremental_index(dirname, index_dir, index_name)
        except:
            clean_index(dirname, index_dir, index_name)
    
def incremental_index(dirname, index_dir, index_name):
    ix = index.open_dir( index_dir, indexname=index_name)
    searcher = ix.searcher()

    # The set of all paths in the index
    indexed_paths = set()
    # The set of all paths we need to re-index
    to_index = set()

    writer = ix.writer()

    # Loop over the stored fields in the index
    for fields in searcher.all_stored_fields():
        indexed_path = fields['path']
        indexed_paths.add(indexed_path)

        if not os.path.exists(indexed_path):
            # This file was deleted since it was indexed
            writer.delete_by_term('path', indexed_path)
        else:
            # Check if this file was changed since it
            # was indexed
            indexed_time = fields['time']
            mtime = os.path.getmtime(indexed_path)
            if mtime > indexed_time:
                # The file has changed, delete it and add it to the list of
                # files to reindex
                writer.delete_by_term('path', indexed_path)
                to_index.add(indexed_path)

    # Loop over the files in the filesystem
    # Assume we have a function that gathers the filenames of the
    # documents to be indexed
    for root, dirnames, filenames in os.walk(dirname):
        for filename in filenames:
            if filename.endswith(('.py','.html','.php')):
                py_file = (os.path.join(root, filename))
                if py_file in to_index or py_file not in indexed_paths:
                    # This is either a file that's changed, or a new file
                    # that wasn't indexed before. So index it!
                    add_doc(writer, py_file)
    writer.commit()

def find(index_path_file, q):
    index_name = os.path.basename(index_path_file)
    index_dir = os.path.dirname(index_path_file)
    from whoosh.qparser import QueryParser
    ix = index.open_dir(index_dir, indexname=index_name)
    s=ix.searcher()
    qp = QueryParser("content", schema=ix.schema)
    p = qp.parse(unicode(q))
    return s.search(p, limit=None)
