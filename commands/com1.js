var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv) {
   var entry = this.terminal.GetEntry(argv[0]);
   if (!entry)
      this.terminal.Write('File does not exist!');
   else if (entry.type == 'dir')
      this.terminal.Write('cat: ' + argv[0] + ': Is a directory.');
   else
      this.terminal.Write(entry.contents);
}

COMMANDS.cd = function(argv) {
   var entry = this.terminal.GetEntry(argv[0]);
   if (!entry)
      this.terminal.Write('bash: cd: ' + argv[0] + ': No such file or directory');
   else if (entry.type != 'dir')
      this.terminal.Write('bash: cd: ' + argv[0] + ': Not a directory.');
   else
      this.terminal.cwd = entry;
}

COMMANDS.ls = function(argv) {
   if (!argv.length) {
      for (i in this.terminal.cwd.contents) {
         if (this.terminal.cwd.contents[i].name[0] != '.')
            this.terminal.Write(this.terminal.cwd.contents[i].name + ' ');
      }
   } else {
      var entry = this.terminal.GetEntry(argv[0]);
      if (!entry)
         this.terminal.Write('ls: cannot access ' + argv[0] + ': No such file or directory');
      for (i in entry.contents) {
         if (entry.contents[i].name[0] != '.')
            this.terminal.Write(entry.contents[i].name + ' ');
      }
   }
}
