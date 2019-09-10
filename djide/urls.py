from django.conf.urls import url
import djide.views
# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()
#
urlpatterns = [
    url(r'^$', djide.views.edit, name='edit'),
    url(r'^tree-data$', djide.views.tree_data, name='treedata'),
    url(r'^model-editor', djide.views.model_editor, name='modeleditor'),
]
