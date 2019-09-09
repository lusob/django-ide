import os,sys, json, urllib.parse
from os.path import join

from django.template import RequestContext
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

METAFILES_PATH = os.path.join(os.path.dirname(sys.argv[0]), "metafiles")
if not os.path.exists(METAFILES_PATH):
    os.makedirs(METAFILES_PATH)

@csrf_exempt
def tree_data(request):
    node = request.POST.get('node')
    app_name = node.split('/')[0]
    modPath = __import__(app_name).__path__[0]
    projectRoot = modPath.rstrip(app_name)
    response=[]
    rootNode=os.path.join(projectRoot,node)
    for name in os.listdir(rootNode):
        fullpath = os.path.join(rootNode, name)
        relativePath = os.path.join(request.POST.get('node'), name)
        if os.path.isfile(fullpath):
            response += [{'id': relativePath, 'text': name, 'url': relativePath, 'leaf': 'true', 'cls': 'file'}]
        else:
            response += [{'id': relativePath, 'text': name, 'url': relativePath, 'cls': 'folder'}]
    return HttpResponse(json.dumps(response), content_type='application/json')

@csrf_exempt
def model_editor(request):
    app_name = request.POST.get('app_name')
    modPath = __import__(app_name).__path__[0]
    projectRoot = modPath.rstrip(app_name)
    response=[]
    
    if(request.POST.get('cmd') == 'getMeta'):
        return HttpResponse(open(os.path.join(METAFILES_PATH,'.%s' % urllib.parse.unquote_plus(request.POST.get('app_name'))),'a+').read(), content_type='application/json')
    elif(request.POST.get('cmd') == 'setMeta'):
        setMetaFile(request.POST.get('app_name'),request.POST.get('meta'))
        return HttpResponse("")
    elif(request.POST.get('cmd') == 'getData'):
        arrData = {} 
        try:
            if(request.POST.get('meta')!=None):
                metaDataServer = open(os.path.join(METAFILES_PATH,'.%s' % urllib.parse.unquote_plus(request.POST.get('app_name'))),'a+').read()
                metaArrayServer = json.loads(metaDataServer).get('versions')
                metaArrayClient = json.loads(request.POST.get('meta')).get('versions')
                for (id,value) in metaArrayServer.items():
                    if(id not in metaArrayClient or value > metaArrayClient[id]): 
                        fileContent = getDataFile(id, projectRoot)
                        arrData[id] = fileContent
            else:
                fileContent = getDataFile(request.POST.get('path'), projectRoot)
                arrData['id'] = urllib.parse.quote_plus(request.POST.get('path'))
                arrData['content'] = fileContent
        except ValueError:
            pass
        return HttpResponse(json.dumps(arrData), content_type='application/json')
    elif(request.POST.get('cmd') == 'setMetaAndData'):
        setMetaFile(request.POST.get('app_name'),request.POST.get('meta'))
        dataPost = request.POST.get('data')
        dataArray = json.loads(dataPost, strict=False)
        for (fileName,fileContent) in dataArray.items():
            setDataFile(fileName, fileContent, projectRoot)
        return HttpResponse("")
    elif(request.POST.get('cmd') == 'setData'):
        dataPost = request.POST.get('data')
        setDataFile(request.POST.get('path'), dataPost, projectRoot)
        return HttpResponse("")
    elif(request.POST.get('cmd') == 'find'):        
        keywords = request.POST.get('keywords');
        if(keywords and len(keywords)>0):
            import whooshlib
            index_path_file = os.path.join(METAFILES_PATH,'.%s_index' % urllib.parse.unquote_plus(app_name))
            whooshlib.index_my_docs('%s%s'%(projectRoot, app_name), index_path_file)
            arrResults = []
            for hit in whooshlib.find(index_path_file, keywords):
                arrResults.append([hit.highlights("content"), hit["path"]])
            return HttpResponse(json.dumps(arrResults) if len(arrResults)>0 else json.dumps([['No results found','']]))      
    else:
        return HttpResponse("")

def edit(request):
    app_name = request.GET.get('appname')
    if app_name:
        return render_to_response('ide.html', {'app_name':app_name})
    else:
        a=[]
        for app in settings.INSTALLED_APPS:
            mod = __import__(app)
            a += [mod.__name__]
        return render_to_response('index.html', {'apps':list(set(a))})

def setMetaFile(app_name, metaData):
    metaDataFile = os.path.join(METAFILES_PATH,'.%s' % urllib.parse.unquote_plus(app_name))
    try: 
        handle = open(metaDataFile, 'w')
        handle.write(metaData)
    except IOError as e:
        return HttpResponse('File exception (%s): %s, %s'%(metaDataFile,e.errno,e.strerror))
    finally:
        handle.close()

def setDataFile(id, fileContent, rootPath):
    try:
        fullPathName = os.path.join(rootPath, urllib.parse.unquote_plus(id))
        handle = open(fullPathName, 'w')
        handle.write(fileContent)
        handle.close()
    except IOError:
        return HttpResponse('File exception (%s)'%urllib.parse.unquote_plus(id))

    
def getDataFile(id, rootPath):
    try: 
        return open(os.path.join(rootPath, urllib.parse.unquote_plus(id))).read()
    except IOError:
        return HttpResponse('File exception (%s)'%id)
