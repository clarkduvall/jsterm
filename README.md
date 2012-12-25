# jsterm
jsterm is a terminal simulator that uses a JSON filesystem. To see it in use,
check out [clarkduvall.com](http://clarkduvall.com).

## How To Use
At the bottom of the [js/jsterm.js](jsterm/tree/master/js/jsterm.js) file,
there is a list of term.Enqueue() calls. This is where the commands are set that
are run when the page loads. Other changes can be made to personalize your
terminal. The directory structure is as follows:
- commands - A JS file with all the possible commands that can be run. Add new
  commands here.
- config - A JS file that has basic configuration information. Change things
  like the prompt here.
- css - The CSS used on the page.
- images - Image files used in your filesystem.
- js - The jsterm implementation.
- json - Where the filesystem is stored. Change the term.Init() call in
  [js/jsterm.js](jsterm/tree/master/js/jsterm.js) to change which filesystem is
  loaded.

## Filesystem Format
A filesystem is a recursive grouping of JSON arrays of objects. Each nested
array represents the listing of items in a directory. Each object in the array
defines a file or directory. For an example, see json/sample.json.

## make_fs.py
This is a script that will create a jsterm filesystem from a real directory.
Examples of how to make different file types are as follows:
- Text file (no execute permissions):

	This is a text file.
- Executable/link (MUST BE MARKED EXECUTABLE):

	http://google.com
- Image file: can be any image file with a standard extension (e.g. .png, .jpg)
