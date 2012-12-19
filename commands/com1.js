var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv, cb) {
   var filenames = this._terminal.ParseArgs(argv).filenames;
   this._terminal.Scroll();
   if (!filenames.length) {
      this._terminal.ReturnHandler = function() {
         var stdout = this.Stdout();
         if (!stdout)
            return;
         stdout.innerHTML += '<br>' + stdout.innerHTML + '<br>';
         this.Scroll();
         this.NewStdout();
      }.bind(this._terminal);
      return;
   }
   filenames.forEach(function(filename, i) {
      var entry = this._terminal.GetEntry(filename);
      if (!entry)
         this._terminal.Write('cat: ' + filename + ': No such file or directory');
      else if (entry.type == 'dir')
         this._terminal.Write('cat: ' + filename + ': Is a directory.');
      else
         this._terminal.Write(entry.contents);
      if (i != filenames.length - 1)
         this._terminal.Write('<br>');
   }, this);
   cb();
}

COMMANDS.cd = function(argv, cb) {
   var filename = this._terminal.ParseArgs(argv).filenames[0];
   if (!filename)
      filename = '~';
   var entry = this._terminal.GetEntry(filename);
   if (!entry)
      this._terminal.Write('bash: cd: ' + filename + ': No such file or directory');
   else if (entry.type != 'dir')
      this._terminal.Write('bash: cd: ' + filename + ': Not a directory.');
   else
      this._terminal.cwd = entry;
   cb();
}

COMMANDS.ls = function(argv, cb) {
   var result = this._terminal.ParseArgs(argv);
   var args = result.args;
   var filename = result.filenames[0];
   var entry = filename ? this._terminal.GetEntry(filename) : this._terminal.cwd;
   var WriteEntry = function (e, str) {
      this.WriteLink(e, str);
      if (args.indexOf('l') > -1) {
         if ('description' in e)
            this.Write(' - ' + e.description);
         this.Write('<br>');
      } else {
         this.Write('  ');
      }
   }.bind(this._terminal);

   if (!entry)
      this._terminal.Write('ls: cannot access ' + filename + ': No such file or directory');
   else if (entry.type == 'dir') {
      var dirStr = this._terminal.DirString(entry);
      for (i in entry.contents) {
         var e = entry.contents[i];
         if (args.indexOf('a') > -1 || e.name[0] != '.')
            WriteEntry(e, dirStr + '/' + e.name);
      }
   } else {
      WriteEntry(entry, filename);
   }
   cb();
}

COMMANDS.gimp = function(argv, cb) {
   var filename = this._terminal.ParseArgs(argv).filenames[0];
   if (!filename) {
      this._terminal.Write('gimp: please specify an image file.');
      cb();
      return;
   }
   var entry = this._terminal.GetEntry(filename);
   if (!entry || entry.type != 'img') {
      this._terminal.Write('gimp: file ' + filename + ' is not an image file.');
   } else {
      this._terminal.Write('<img src="' + entry.contents + '"/>');
      var imgs = this._terminal.div.getElementsByTagName('img');
      imgs[imgs.length - 1].onload = function() {
         this.Scroll();
      }.bind(this._terminal);
      this._terminal.Write('<br/>' + entry.caption);
   }
   cb();
}

COMMANDS.clear = function(argv, cb) {
   this._terminal.div.innerHTML = '';
   cb();
}

COMMANDS.sudo = function(argv, cb) {
   var count = 0;
   this._terminal.ReturnHandler = function() {
      if (++count < 3) {
         this.Write('<br/>Sorry, try again.<br/>');
         this.Write('[sudo] password for ' + this.config.username + ': ');
         this.Scroll();
      } else {
         this.Write('<br/>sudo: 3 incorrect password attempts');
         cb();
      }
   }.bind(this._terminal);
   this._terminal.Write('[sudo] password for ' + this._terminal.config.username + ': ');
   this._terminal.Scroll();
}

COMMANDS.login = function(argv, cb) {
   this._terminal.ReturnHandler = function() {
      this.Scroll();
      var username = this.Stdout().innerHTML;
      if (username)
         this.config.username = username;
      this.Write('<br>Password: ');
      this.Scroll();
      this.ReturnHandler = function() { cb(); }
   }.bind(this._terminal);
   this._terminal.Write('Username: ');
   this._terminal.NewStdout();
   this._terminal.Scroll();
}

COMMANDS.tree = function(argv, cb) {
   var term = this._terminal;
   function Tree(dir, level) {
      dir.contents.forEach(function(entry) {
         if (entry.name.startswith('.'))
            return;
         var str = '';
         for (var i = 0; i < level; i++)
            str += '|  ';
         str += '|&mdash;&mdash;';
         term.Write(str);
         term.WriteLink(entry, term.DirString(dir) + '/' + entry.name);
         term.Write('<br>');
         if (entry.type == 'dir')
            Tree(entry, level + 1);
      });
   };
   var home = this._terminal.GetEntry('~');
   this._terminal.WriteLink(home, '~');
   this._terminal.Write('<br>');
   Tree(home, 0);
   cb();
}

COMMANDS.help = function(argv, cb) {
   this._terminal.Write(
       'You can navigate either by clicking on anything that ' +
       '<a href="javascript:void(0)">underlines</a> when you put your mouse ' +
       'over it, or by typing commands in the terminal. Type the name of a ' +
       '<span class="exec">link</span> to view it. Use "cd" to change into a ' +
       '<span class="dir">directory</span>, or use "ls" to list the contents ' +
       'of that directory. The contents of a <span class="text">file</span> ' +
       'can be viewed using "cat". <span class="img">Images</span> are ' +
       'displayed using "gimp".<br><br>If there is a command you want to get ' +
       'out of, press Ctrl+C or Ctrl+D.<br><br>');
   this._terminal.Write('Commands are:<br>');
   for (c in this._terminal.commands) {
      if (this._terminal.commands.hasOwnProperty(c) && !c.startswith('_'))
         this._terminal.Write(c + '  ');
   }
   cb();
}
