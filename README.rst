===========
Django-IDE
===========

The Django-IDE is a web based IDE made with html5 and javascript
Currently, the following features have been written and are working:

- Local storage: When you open a file once, this is copied to browser local storage, 
  so the next times you open this file, if it has not changed, it will open intantaneusly 
  from browser storage instead of getting it from server.
- Offline mode: 
  When you lose your connection, as it uses the local storage to save data on your browser, 
  you can continue working in the open files and the changes generated offline will be sent 
  to the server the next time the ide detects a connection.
- Sync changes:
  If you are editing a file and, at the same time, other person edits it, the ide notify you
  of these changes and proposes you to get external changes or override with yours
- Resources filter
- Source code color syntax
- Source code formatting

Installation
============
- From pypi:
    $sudo pip install django-ide

- From source:
    $sudo python setup.py install

Configuration
=============

The django-ide has two settings that can be set in `settings.py`:

#. Add `djide` to your INSTALLED_APPS in your ``settings.py`` project:

    INSTALLED_APPS = (
        'djide',
#. Include djide urls in your ``urls.py`` project:

    urlpatterns = patterns(
        (r'^djide/', include('djide.urls')),

RUN   
===
$python manage.py runserver
That's it, the last command should start a local server on port 8000, now you can 
open your browser and go to 127.0.0.1:8000/djide/edit to edit your projects apps.

TODOs and BUGS
==============
See: https://github.com/lusob/django-ide/issues
