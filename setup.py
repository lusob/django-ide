import os
from setuptools import setup
#from distutils.core import setup
def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()

requires = ['whoosh']

setup(
        name = 'django-ide',
        packages = ['djide',],
        version = '0.0.6',
        description = 'Web based IDE to develop Django apps',
        author = 'Luis Sobrecueva',
        author_email = 'luis@sobrecueva.com',
        license = 'GPL',
        url = 'http://github.com/lusob/django-ide',
        download_url=
        'http://github.com/lusob/django-ide/downloads',
        keywords = ['IDE', 'Integrated Development Environment', 'Django IDE'],
        include_package_data=True,
        install_requires = requires,
        zip_safe=False,
        classifiers = [
        'Programming Language :: Python',
        'Programming Language :: JavaScript',
        'Development Status :: 2 - Pre-Alpha',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License (GPL)',
        'Natural Language :: English',
        'Operating System :: OS Independent',
        'Topic :: Text Editors :: Integrated Development Environments (IDE)',
        ],
        long_description = read('README.md')
)
