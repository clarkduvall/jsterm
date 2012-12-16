# jsterm
jsterm is a terminal simulator that uses a JSON filesystem. To see it in use,
check out [clarkduvall.com](http://clarkduvall.com).
## Filesystem Format
A filesystem is a recursive grouping of JSON arrays of objects. Each nested
array represents the listing of items in a directory. Each object in the array
defines a file or directory.
