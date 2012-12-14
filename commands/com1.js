var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv, cb) {
   var entry = this._terminal.GetEntry(argv[0]);
   if (!entry)
      this._terminal.Write('File does not exist!');
   else if (entry.type == 'dir')
      this._terminal.Write('cat: ' + argv[0] + ': Is a directory.');
   else
      this._terminal.Write(entry.contents);
   cb();
}

COMMANDS.cd = function(argv, cb) {
   if (!argv.length)
      argv[0] = '~';
   var entry = this._terminal.GetEntry(argv[0]);
   if (!entry)
      this._terminal.Write('bash: cd: ' + argv[0] + ': No such file or directory');
   else if (entry.type != 'dir')
      this._terminal.Write('bash: cd: ' + argv[0] + ': Not a directory.');
   else
      this._terminal.cwd = entry;
   cb();
}

COMMANDS.ls = function(argv, cb) {
   var entry = argv.length ? this._terminal.GetEntry(argv[0]) : this._terminal.cwd;
   if (!entry)
      this._terminal.Write('ls: cannot access ' + argv[0] + ': No such file or directory');
   if (entry.type == 'dir') {
      for (i in entry.contents) {
         if (entry.contents[i].name[0] != '.') {
            this._terminal.Write('<div class="' + entry.contents[i].type +
                '">' + entry.contents[i].name + '</div>');
         }
      }
   } else {
      this._terminal.Write('<div class="' + entry.type + '">' + entry.name + '</div>');
   }
   cb();
}
