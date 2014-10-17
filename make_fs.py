#!/usr/bin/python

import argparse
import json
import os
import shutil
import stat
import sys

def _ReadFile(path):
   with open(path) as f:
      return f.read()

class Filesystem(object):
   def __init__(self, path, image_dir):
      self._image_path = image_dir
      self._path = path

   def Create(self):
      return self._CreateDir(self._path, name='~')

   def _CreateFile(self, path):
      if os.stat(path).st_mode & stat.S_IXUSR:
         return self._CreateExec(path)
      elif os.path.splitext(path)[-1] in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico']:
         return self._CreateImage(path)
      else:
         return self._CreateText(path)

   def _CreateImage(self, path):
      name = os.path.split(path)[-1]
      shutil.copyfile(path, os.path.join(self._image_path, name))
      image_json = {
         'name': name,
         'type': 'img',
         'contents': '/images/%s' % name
      }
      return image_json

   def _CreateExec(self, path):
      contents = _ReadFile(path).split('\n')
      exec_json = {
         'name': os.path.split(path)[-1],
         'type': 'exec',
         'contents': contents[0]
      }
      if len(contents) > 1 and len(contents[1]):
         exec_json['description'] = contents[1]
      return exec_json

   def _CreateText(self, path):
      return {
         'name': os.path.split(path)[-1],
         'type': 'text',
         'contents': _ReadFile(path)
      }


   def _CreateDir(self, path, name=None):
      if name is None:
         name = os.path.split(path)[-1]
      dir_json = {
         'name': name,
         'type': 'dir',
         'contents': []
      }
      for filename in os.listdir(path):
         if filename.startswith('.'):
            continue
         full_path = os.path.join(path, filename)
         if os.path.isdir(full_path):
            dir_json['contents'].append(self._CreateDir(full_path))
         else:
            dir_json['contents'].append(self._CreateFile(full_path))
      return dir_json

if __name__ == '__main__':
   parser = argparse.ArgumentParser(
       description='Create a jsterm FS from a directory.')
   parser.add_argument('-d', '--dir', required=True, help='The directory to convert.')
   parser.add_argument('-o', '--out', required=True, help='The file to output to.')
   parser.add_argument('-i', '--image_dir', default='images', help='The directory to copy images to.')
   args = parser.parse_args()
   if not os.path.exists(args.dir):
      print 'Failure: directory %s does not exist.' % args.dir
      sys.exit(1)

   fs = Filesystem(args.dir, args.image_dir)
   with open(args.out, 'w+') as f:
      f.write(json.dumps(fs.Create(), indent=3))
