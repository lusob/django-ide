Ext.onReady(function(){
    // Show a warning dialog if there are modified files before exit
    window.onbeforeunload = function(){
        for (var id in aEditors) {
            if (aEditors[id].getCode() != localStorage.getItem(id))
                return("There are unsaved changes, press cancel if you want save your changes before exit");
        }
    };
    
    setActiveStyleSheet('gray');
    
    var tabPanelWest;
    var checkOutUrl;
    var appnamePath;
    var openNewProject;
    Ext.Ajax.timeout = 240000; //4 minutes
    
    function onkeydown_handler(event){
        if (event.altKey)
            launchShortcut(event.which);
    }
    
    // Map 
    var map = new Ext.KeyMap(Ext.getDoc(), [
        {
            key: "f,o,s",
            alt:true,
            fn: launchShortcut,
            scope: this,
            stopEvent:true
        }
    ]);    
    
    function launchShortcut(keyCode)
    {
        switch (keyCode)
        { 
            case 70 : // 'F'
                    onButtonFindClick();
                break;
            case 79 : // 'O'
                    onButtonOpenClick();
                break;
            case 83 : // 'S'
                    onButtonSaveClick();
                break;;
        }
    }

    
    Ext.ns('Ext.ux.tree');
    /**
    * Creates new TreeFilterX
    * @constructor
    * @param {Ext.tree.TreePanel} tree The tree panel to attach this filter to
    * @param {Object} config A config object of this filter
    */
    Ext.ux.tree.TreeFilterX = Ext.extend(Ext.tree.TreeFilter, {
        
        // {{{
        /**
        * Filter the data by a specific attribute.
        *
        * @param {String/RegExp} value Either string that the attribute value 
        * should start with or a RegExp to test against the attribute
        * @param {String} attr (optional) The attribute passed in your node's attributes collection. Defaults to "text".
        */
        filter:function(value, attr, startNode) {
            
            var animate = this.tree.animate;
            this.tree.animate = false;
            this.tree.expand(startNode);
            this.tree.animate = animate;
            Ext.ux.tree.TreeFilterX.superclass.filter.apply(this, arguments);
            
        } // eo function filter
        // }}}
        // {{{
        /**
        * Filter by a function. The passed function will be called with each 
        * node in the tree (or from the startNode). If the function returns true, the node is kept 
        * otherwise it is filtered. If a node is filtered, its children are also filtered.
        * Shows parents of matching nodes.
        *
        * @param {Function} fn The filter function
        * @param {Object} scope (optional) The scope of the function (defaults to the current node) 
        */
        ,filterBy:function(fn, scope, startNode) {
            startNode = startNode || this.tree.root;
            if(this.autoClear) {
                this.clear();
            }
            var af = this.filtered, rv = this.reverse;
            
            var f = function(n) {
                if(n === startNode) {
                    return true;
                }
                if(af[n.id]) {
                    return false;
                }
                var m = fn.call(scope || n, n);
                if(!m || rv) {
                    af[n.id] = n;
                    n.ui.hide();
                    return true;
                }
                else {
                    n.ui.show();
                    var p = n.parentNode;
                    while(p && p !== this.root) {
                        p.ui.show();
                        p = p.parentNode;
                    }
                    return true;
                }
                return true;
            };
            startNode.cascade(f);
            
            if(this.remove){
                for(var id in af) {
                    if(typeof id != "function") {
                        var n = af[id];
                        if(n && n.parentNode) {
                            n.parentNode.removeChild(n);
                        }
                    }
                } 
            }
        } // eo function filterBy
        // }}}
        
    }); // eo extend

    
    
    function fillTreeFiles(res){     
        // Load files tree with the working copy
        /* ---- Begin side_navbar tree --- */
        Ext.namespace('Ext.ux');

        Ext.ux.FilterTree = Ext.extend(Ext.tree.TreePanel, {
            autoScroll: true,
            animate: true,
            containerScroll: true,
            border: false,
            enableDD: true,
            useArrows: true,
            dataUrl: 'tree-data',
          initComponent: function() {

                var that = this;

            this.root= {
                nodeType: 'async',
                text: 'Files',
                draggable: false,
                id: appname
            };
            this.listeners= {
                'click': function(node, e) {
                    if(node.leaf) {
                        current_directory = node.attributes.url;
                        syncEditor(current_directory);
                    }
                },
                'contextmenu': function(node, e) {
                    node.select();
                    context_menu.node = node;
                    context_menu.show(e.getTarget());
                },
                //'beforenodedrop': do_move
            };
            this.tbar=['Filter:', {
                xtype:'trigger'
                ,triggerClass:'x-form-clear-trigger'
                ,onTriggerClick:function() {
                    this.setValue('');
                    that.filter.clear();
                }
                ,id:'filter'
                ,enableKeyEvents:true
                ,listeners:{
                    keyup:{buffer:150, fn:function(field, e) {
                        var val = this.getRawValue();
                        if(Ext.EventObject.ESC == e.getKey() || !val.match(/\S/)) {
                            field.onTriggerClick();
                        }
                        else {
                            var re = new RegExp('.*' + val + '.*', 'i');
                            tree.filter.clear();
                            tree.filter.filter(re, 'text');
                        }
                    }}
                }
            }];
           this.filter = new Ext.ux.tree.TreeFilterX(this);

           Ext.ux.FilterTree.superclass.initComponent.apply(this, arguments);

          }
        });
        Ext.reg('FilterTree', Ext.ux.FilterTree);

        tree = new Ext.ux.FilterTree();
        //tree.expandAll(); 
        tree.collapseAll();
        //tree.getRootNode().expand();
        tabPanelWest.add(tree);
        tabPanelWest.setActiveTab(0);
    }

    if(window.location.pathname=='/djide'){
        var fs = new Ext.FormPanel({
            labelAlign: 'right',
            labelWidth: 85,
            waitMsgTarget: true,
            frame:true,
            defaultType: 'textfield',
            items: [        
                new Ext.form.ComboBox({
                    fieldLabel: 'Version control',
                    hiddenName:'vcCmd',
                    store: new Ext.data.ArrayStore({
                        fields: ['vc','vcCmd'],
                        data : [['Mercurial','hg clone'],['Git','git clone'],['Subversion','svn co']]  
                    }),
                    valueField:'vcCmd',
                    displayField:'vc',
                    typeAhead: true,
                    mode: 'local',
                    triggerAction: 'all',
                    emptyText:'Select a version control client...',
                    selectOnFocus:true,
                    width:190
                }),
                new Ext.form.Hidden({name:'cmd', value:'checkOut'}),
                {
                    fieldLabel: 'Url',
                    emptyText: 'http://...',
                    name: 'url',
                    width:190
                }, {
                    fieldLabel: 'Working copy',
                    emptyText: 'My working copy',
                    id: 'appname',
                    name: 'appname',
                    width:190
                }
            ]
            
        });

        // explicit add
        function submitForm(){
            fs.getForm().submit({
                url:'model-editor',
                waitMsg:'Checking out...',
                submitEmptyText: false,
                timeout: 240,
                success: function(form, action) {
                    appname = Ext.getCmp('workingcopy').getValue();
                    appnamePath = 'workingcopies/'+appname;
                    onCheckoutFinished();
                    w.close();
                },
                failure: function(form, action) {
                    Ext.Msg.alert('Failure', action.result.msg);
                }
            });
        }    

        var submit = new Ext.Button({
            text: 'Submit',
            disabled:false,
            handler: submitForm
        });
        
        var map = new Ext.KeyMap(Ext.getDoc(), {
            key: Ext.EventObject.ENTER,
            fn: submitForm,
            scope: this
        });

        var w = new Ext.Window({
            title:'Checkout project',
            minimizable: false,
            maximizable: false,
            width: 330,
            height: 150,
            layout: 'fit',
            border:false,
            buttonAlign: 'center',
            items: fs,
            buttons: [
                submit
                ,
                {
                    text: 'Cancel',
                    handler: function(){
                        w.close();
                    }
                }]
        });
        w.show();
        openNewProject = true;
    } else {
        openNewProject = false;
        //appname = window.location.pathname.split('\/')[1];
        //appnamePath = (window.location.pathname!='/edit')?'workingcopies'+window.location.pathname:'.';
        //appnamePath = getUrlParam('appath');
        syncProject('load');
    }
    
    var aEditors = {};
    var tabs = new Ext.TabPanel({
        resizeTabs:true, // turn on tab resizing
        minTabWidth: 115,
        tabWidth:135,
        enableTabScroll:true,
        width:600,
        height:250,
        defaults: {autoScroll:true},
        region: 'center', // a center region is ALWAYS required for border layout
        deferredRender: false,
        activeTab: 0,     // first tab initially active
        idDelimiter: '--' // Cambio el caracter delimitador por que muchos ficheros python usan el por defecto ('_') como nombre de fichero
        //plugins: new Ext.ux.TabCloseMenu()
    });
    // tab generation code
    function addTab(filePath,id){
        var fileName = filePath.replace(/^.*[\/\\]/g, '');
        tabs.add({
            title: fileName,
            id: id,
            iconCls: 'tabs',
            html: '<textarea id=textarea_'+id+'> </textarea>',
            closable:true,
            listeners: {
                beforeclose: function(tab){
                    if (aEditors[id].getCode() != localStorage.getItem(id)) {
                        // Show a confirmation dialog to save file
                        Ext.Msg.show({
                            title:'Save Changes?',
                            msg: 'You are closing a tab that has unsaved changes. Would you like to save your changes?',
                            buttons: Ext.Msg.YESNOCANCEL,
                            fn: function(btn){
                                if(btn=="yes") {
                                    saveEditorContentToLocalStorage(id);
                                    delete aEditors[id];
                                    tabs.remove(tab);
                                }
                                else if(btn=="no") {
                                    delete aEditors[id];
                                    tabs.remove(tab);
                                }
                            },
                            animEl: 'elId',
                            icon: Ext.MessageBox.QUESTION
                        });
                        return false;
                    } else {
                        delete aEditors[id];
                        tabs.remove(tab);
                        return false;
                    }
                }
            }
        }).show();
        
        var editorStyleFiles = ["/static/codemirror/xmlcolors_on_white.css", "/static/codemirror/jscolors_on_white.css", "/static/codemirror/csscolors_on_white.css"];
        var editorParserFiles = ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js", "parsehtmlmixed.js"];
        var fileExtension = (/[.]/.exec(filePath)) ? /[^.]+$/.exec(filePath) : undefined;
        var parserCfg = {};
        switch(''+fileExtension) {
            case "js":
                editorStyleFiles = ["/static/codemirror/jscolors_on_white.css"];
                editorParserFiles = ["tokenizejavascript.js", "parsejavascript.js"];
                break;
                    case "css":
                editorStyleFiles = ["/static/codemirror/csscolors_on_white.css"];
                editorParserFiles = ["parsecss.js"];
                break;
                    case "py":
                editorStyleFiles = ["/static/codemirror/pythoncolors.css"];
                editorParserFiles = ["parsepython.js"];
                parserCfg = {'pythonVersion': 2, 'strictErrors': true};
                break;
                    }        
        aEditors[id] = CodeMirror.fromTextArea('textarea_'+id, {
            stylesheet: editorStyleFiles,
            parserfile: editorParserFiles,
            path: "/static/codemirror/",
            autoMatchParens : true,
            height : '100%',
            content: localStorage.getItem(id),
            textWrapping: false,
            lineNumbers: true,
            indentUnit: 4,
            
            
            breakPoints: false,
            iframeClass: 'editorCode',
            parserConfig: parserCfg
        });
        
        // Shortcuts on canvas
        var iFrame = aEditors[id].frame;        
        if (iFrame.attachEvent) {
            iFrame.attachEvent('onkeydown', onkeydown_handler);
        } else if (iFrame.addEventListener) {
            iFrame.contentWindow.document.addEventListener('keydown', onkeydown_handler, false);
        } else {
            iFrame.onmouseover = onkeydown_handler;
        }     
    }
    new Ext.Button({
        text: 'Add Tab',
        handler: addTab,
        iconCls:'new-tab'
    }).render(document.body, 'tabs');
    
    // Setup a variable for the current directory
    var current_directory = '';
    
    
    var findGrid = new Ext.grid.GridPanel({
        store: new Ext.data.ArrayStore({
            fields: ['context','location'],
            idIndex: 0
        }),
        colModel: new Ext.grid.ColumnModel({
            defaults: {
                sortable: true
            },
            columns: [
                {header: 'Context', dataIndex: 'context'},
                {header: 'Location', dataIndex: 'location'}
            ]}),
        viewConfig: {
            forceFit: true,
            //      Return CSS class to apply to rows depending upon data values
            getRowClass: function(record, index) {
                var c = record.get('change');
                if (c < 0) {
                    return 'par';
                } else if (c > 0) {
                    return 'impar';
                }
            }
        },
        sm: new Ext.grid.RowSelectionModel({singleSelect:true}),
        title: 'Search',
        iconCls: 'icon-grid',
        listeners: {
            'rowclick': function( grid, rowIndex, e ) {
                var fileFullPath = grid.store.getAt(rowIndex).get('location');
                syncEditor(fileFullPath);
            }
        }
    });
    
    var consolePanel = new Ext.Panel({
        // lazily created panel (xtype:'panel' is default)
        region: 'south',
        contentEl: 'south',
        split: true,
        collapsed:true,
        height: 200,
        maxSize: 300,
        collapsible: true,
        title: 'Console',
        margins: '0 0 0 0',
        layout: 'fit', // specify layout manager for items
        items:            // this TabPanel is wrapped by another Panel so the title will be applied
        new Ext.TabPanel({
            border: false, // already wrapped so don't add another border
            activeTab: 0, // second tab initially active
            tabPosition: 'bottom',
            items: [
                findGrid
            ]
        })
    });
    
    var viewport = new Ext.Viewport({
        layout: 'border',
        items: [
            new Ext.Toolbar({
                height: 32,
                region: 'north',
                items: [{
                    text: 'Files',
                    menu: [{text: 'Open Project\t(Alt+O)', handler: onButtonOpenClick},
                           {text: 'Save Project\t(Alt+S)', handler: onButtonSaveClick}]
                },{
                    text: 'Edit',
                    menu: [{text: 'Format Selection\t(Tab)', handler: onButtonReindentClick},
                           {text: 'Find in project\t(Alt+F)', handler: onButtonFindClick}]
                },{
                    text: 'Style',
                    menu: {        // <-- submenu by nested config object
                        items: [
                            // stick any markup in a menu
                            '<b class="menu-title">Choose a Theme</b>',
                            {
                                text: 'Gray Theme',
                                value: 'gray',
                                checked: true,
                                group: 'theme',
                                checkHandler: onStyleChange
                            }, {
                                text: 'Aero Glass',
                                value: 'blue',
                                checked: false,
                                group: 'theme',
                                checkHandler: onStyleChange
                            }
                        ]
                    }
                    
                }]
            }),
            consolePanel, 
            {
                region: 'east',
                title: 'Properties',
                collapsible: true,
                split: true,
                width: 225, // give east and west regions a width
                minSize: 175,
                maxSize: 400,
                margins: '0 5 0 0',
                layout: 'fit', // specify layout manager for items
                items:            // this TabPanel is wrapped by another Panel so the title will be applied
                new Ext.TabPanel({
                    border: false, // already wrapped so don't add another border
                    activeTab: 0, // second tab initially active
                    tabPosition: 'bottom',
                    items: [
                        new Ext.grid.PropertyGrid({
                            title: 'Property Grid',
                            closable: true,
                            source: {
                                "name": "test",
                                "read only": false,
                                "created": new Date(Date.parse('10/15/2006')),
                                "Modified": false,
                                "version": 0.01
                            }
                        })]
                })
            }, {
                region: 'west',
                id: 'west-panel', // see Ext.getCmp() below
                title: 'Project Explorer',
                split: true,
                width: 200,
                minSize: 175,
                maxSize: 400,
                collapsible: true,
                margins: '0 0 0 5',
                layout: {
                    type: 'accordion',
                    animate: true
                },
                items:
                tabPanelWest = new Ext.TabPanel({
                    border: false,
                    tabPosition: 'bottom'
                })
            },
            tabs
        ]
    });
    
    if(!openNewProject){
        fillTreeFiles();
        Ext.getBody().unmask();
    }
    
    function onCheckoutFinished() {
        window.location = appname;
    }
    
    function onButtonSaveClick(){
        syncProject('save');
    }
    function onButtonOpenClick(){
        window.location='/djide';
    }
    function onButtonReindentClick(){
        aEditors[tabs.getActiveTab().id].reindentSelection();
    }
    function onButtonFindClick(){
        /*
        Ext.Msg.show({
            title:'Feature not available',
            msg: 'This feature is pending to do in next releases.',
        });               
        */
        
        Ext.Msg.prompt('Keywords', 'Please enter text to find:', function(btn, keywords){
            if (btn == 'ok' && !isEmpty(keywords)){
                Ext.getBody().mask('Searching...', 'x-mask-loading');
                Ext.Ajax.request({
                    url: 'model-editor',
                    params: { cmd: 'find', keywords: keywords, app_name: appname },
                    success: function(dataServerObj){
                        var arrDataServer = Ext.util.JSON.decode(dataServerObj.responseText);
                        findGrid.store.loadData(arrDataServer);
                        Ext.getBody().unmask();
                        consolePanel.expand(true);
                    },
                    failure: function(){
                        Ext.getBody().unmask();
                    }
                });
            }
        });
        
    }
    function onStyleChange(item, checked){
        if (checked)
            setActiveStyleSheet(item.value);
    }
    
    function saveLocalStorage(){
        // Push local storage data to server
        for (var id in aEditors) {
            saveEditorContentToLocalStorage(id);
        }    
    }
    
    function saveEditorContentToLocalStorage(id){
        if (aEditors.hasOwnProperty(id) && (aEditors[id].getCode() != localStorage.getItem(id))) {
            localStorage.setItem(id, aEditors[id].getCode());
        }
    }
    
    function syncEditor(filePath){
        var id = encodeURIComponent(filePath);
        if(null==localStorage.getItem(id)) {
            // Set local storage with remote data
            var serverData = new Ext.data.JsonStore({
                url: 'model-editor',
                fields: ['id','content'],
                listeners: {load:serverDataLoaded}
            });
            serverData.load({params: {cmd: "getData", app_name: appname, path: filePath}});
        } else {
            // Add tab with editor with local storage content
            if(document.getElementById(id)==null)
                addTab(filePath,id);
            else {
                tabs.setActiveTab(tabs.getItem(id).id);
                }
        }
        function serverDataLoaded(serverData) {
            serverData.each(function(r){
                localStorage.setItem(r.get("id"), r.get("content"));
                var id = r.get("id");
                // Add tab with editor with local storage content
                if(document.getElementById(id)==null)
                    addTab(filePath,id);
                else {
                    tabs.setActiveTab(tabs.getItem(id));
                }
            });
        }
    }
    
    function syncProject(action) {
        switch(action) {
            case 'load':
                Ext.getBody().mask('Loading project...', 'x-mask-loading');
                Ext.Ajax.request({
                    url: 'model-editor',
                    params: { cmd: 'getMeta', app_name: appname },
                    success: function(metaServerObj){
                        metaServer = metaServerObj.responseText; 
                        var lsMeta = localStorage[appname+'_meta'];
                        if(lsMeta!=metaServer) {
                            // Get remote files based on metadata
                            Ext.Ajax.request({
                                url: 'model-editor',
                                params: {cmd: 'getData', app_name: appname, meta: lsMeta},
                                success: function(dataServer){
                                    var arrDataServer = Ext.util.JSON.decode(dataServer.responseText);
                                    for(var item in arrDataServer) {
                                        localStorage.setItem(item, arrDataServer[item]);
                                    }
                                    localStorage[appname+'_meta'] = metaServer;
                                    updateUI();
                                }
                            });
                        }
                        aMeta = Ext.util.JSON.decode(lsMeta);
                        for(var id in aMeta['open_files']){
                            syncEditor(decodeURIComponent(id));
                            //aEditors[id].jumpToLine(aEditors[id].nthLine(aMeta['open_files'][id]));
                        }
                        tabs.setActiveTab(tabs.getItem(aMeta['active_file']));
                        
                    }, 
                    failure: function(){              
                        Ext.Msg.alert('Sync', 'Offline mode: It is not possible to connect to server, there may be connection problems, please try again later');
                    }
                });
                break;
                    
                    case 'save':
                Ext.getBody().mask('Saving project...', 'x-mask-loading');
                var arrIdsModifiedFiles = actualizaIdsModifiedFiles();
                saveLocalStorage();
                Ext.Ajax.request({
                    url: 'model-editor',
                    params: { cmd: 'getMeta', app_name: appname },
                    success: function(metaServerObj){
                        metaServer = metaServerObj.responseText;
                        var lsMeta = localStorage[appname+'_meta'];
                        if(lsMeta==metaServer) {
                            var aMetaToSend = (lsMeta.length==0)?{"versions":{}, "open_files":{}, "active_file":""}:Ext.util.JSON.decode(lsMeta);
                            var aDataToSend = {};
                            
                            // Update meta and data arrays
                            for (var i=0; i<arrIdsModifiedFiles.length; i++) {
                                if(arrIdsModifiedFiles[i] in aMetaToSend['versions']){
                                    aMetaToSend['versions'][arrIdsModifiedFiles[i]]++;
                                } else {
                                    aMetaToSend['versions'][arrIdsModifiedFiles[i]]=0;
                                }
                                aDataToSend[arrIdsModifiedFiles[i]] = localStorage.getItem(arrIdsModifiedFiles[i]);
                            }
                            aMetaToSend['open_files'] = {};
                            for (var id in aEditors) {
                                aMetaToSend['open_files'][id]=aEditors[id].lineNumber(aEditors[id].cursorLine());
                            }
                            aMetaToSend['active_file'] = tabs.getActiveTab().id;
                            if(!isEmpty(aDataToSend) || aMetaToSend != Ext.util.JSON.decode(lsMeta)) {
                                var aMetaToSendSerialized = Ext.util.JSON.encode(aMetaToSend);
                                var aDataToSendSerialized = Ext.util.JSON.encode(aDataToSend);
                                Ext.Ajax.request({
                                    url: 'model-editor',
                                    params: {cmd: "setMetaAndData", app_name: appname, meta: aMetaToSendSerialized, data: aDataToSendSerialized},
                                    success: function(){
                                        localStorage[appname+'_meta'] = aMetaToSendSerialized;
                                        localStorage.removeItem('IdsModifiedFiles');
                                    },
                                    failure: function(){
                                        Ext.Msg.alert('Sync', 'It is not possible to connect to server, try again later');
                                    }
                                });
                            }
                        } else {
                            // Show a confirmation dialog to save file
                            Ext.Msg.show({
                                title:'Reload reload remote changes',
                                msg: 'There are remote changes. Would you like reload your project with this changes?',
                                buttons: Ext.Msg.YESNOCANCEL,
                                fn: function(btn){
                                    if(btn=="yes") {
                                        syncProject('load');
                                    } else if(btn=="no") {
                                        syncProject('save');
                                    }
                                },
                                animEl: 'elId',
                                icon: Ext.MessageBox.QUESTION
                            });
                        }
                    },
                    failure: function() {
                        Ext.Msg.alert('Sync', 'Offline mode: It is not possible to connect to server, try again later');
                    }
                });
                break;                    
                    }
        Ext.getBody().unmask();
        
    }
    
    function actualizaIdsModifiedFiles() {
        var jsonData = Ext.util.JSON.decode(localStorage.getItem('IdsModifiedFiles'));
        var arrIds = (jsonData!=null)?jsonData:Array();
        // Add to array the editors content distinct to local storage items content
        for (var id in aEditors) {
            if ((id in arrIds)==false && aEditors[id].getCode() != localStorage.getItem(id)) {
                arrIds.push(id);
            }
        }
        localStorage.setItem('IdsModifiedFiles', Ext.util.JSON.encode(arrIds));
        return arrIds;
    }
    
    function updateUI() {
        // Update editor wit local storage data
        for (var id in aEditors) {
            if (aEditors[id].getCode() != localStorage.getItem(id)) {
                aEditors[id].setCode(localStorage.getItem(id));
            }
        }
    }
    
    function isEmpty(map) {
        for(var key in map) {
            if (map.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }
    
    function setActiveStyleSheet(title) {
        var i,
            a,
            links = document.getElementsByTagName("link"),
            len = links.length;
        for (i = 0; i < len; i++) {
            a = links[i];
            if (a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
                a.disabled = true;
                if (a.getAttribute("title") == title) a.disabled = false;
            }
        }
    }
    function getUrlParam(param) {
        var params = Ext.urlDecode(location.search.substring(1));
        return param ? params[param] : params;
    }
});


