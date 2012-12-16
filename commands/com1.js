var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv, cb) {
   var filenames = this._terminal.ParseArgs(argv).filenames;
   if (!filenames.length) {
      this._terminal.ReturnHandler = function() {
         var stdout = this.Stdout();
         if (!stdout)
            return;
         stdout.innerHTML += '<br>' + stdout.innerHTML + '<br>';
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
   var WriteEntry = function (e) {
      this.Write('<span class="' + e.type + '">' + this.CreateLink(e, e.name) + '</span>');
      if (args.indexOf('l') > -1 && 'description' in e)
         this.Write(' - ' + e.description);
      this.Write('<br>');
   }.bind(this._terminal);

   if (!entry)
      this._terminal.Write('ls: cannot access ' + filename + ': No such file or directory');
   else if (entry.type == 'dir') {
      for (i in entry.contents) {
         if (args.indexOf('a') > -1 || entry.contents[i].name[0] != '.')
            WriteEntry(entry.contents[i]);
      }
   } else {
      WriteEntry(entry);
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
      } else {
         this.Write('<br/>sudo: 3 incorrect password attempts');
         cb();
      }
   }.bind(this._terminal);
   this._terminal.Write('[sudo] password for clark: ');
}

COMMANDS.login = function(argv, cb) {
   this._terminal.ReturnHandler = function() {
      var username = this.Stdout().innerHTML;
      if (username)
         this.config.username = username;
      this.Write('<br>Password: ');
      this.ReturnHandler = function() { cb(); }
   }.bind(this._terminal);
   this._terminal.Write('Username: ');
   this._terminal.NewStdout();
}
