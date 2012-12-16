var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv, cb) {
   if (!argv.length) {
      this._terminal.ReturnHandler = function() {
         var stdout = this.div.querySelector('#stdout');
         if (!stdout)
            return;
         var text = stdout.innerHTML.split('<br>');
         stdout.innerHTML += '<br>' + text[text.length - 1] + '<br>';
      }.bind(this._terminal);
      return;
   }
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
   var args = [];
   var filename;
   for (i in argv) {
      if (argv[i].startswith('-')) {
         var opts = argv[i].substring(1);
         for (var j = 0; j < opts.length; j++)
            args.push(opts.charAt(j));
      } else {
         filename = argv[i];
      }
   }
   var entry = filename ? this._terminal.GetEntry(filename) : this._terminal.cwd;
   var WriteEntry = function (e) {
      this.Write('<span class="' + e.type + '">' + e.name + '</span>');
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
   if (!argv.length) {
      this._terminal.Write('gimp: please specify an image file.');
      cb();
      return;
   }
   var entry = this._terminal.GetEntry(argv[0]);
   if (entry.type != 'img') {
      this._terminal.Write('gimp: file ' + argv[0] + ' is not an image file.');
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
         this.Write('[sudo] password for clark: ');
      } else {
         this.Write('<br/>sudo: 3 incorrect password attempts');
         cb();
      }
   }.bind(this._terminal);
   this._terminal.Write('[sudo] password for clark: ');
}
