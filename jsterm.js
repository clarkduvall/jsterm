(function() {
   function _Ajax(name, cb) {
      var ajax = new XMLHttpRequest();
      ajax.onreadystatechange = function() {
         if (ajax.readyState == 4 && ajax.status == 200)
            cb(ajax.responseText);
      };
      ajax.open('GET', name);
      ajax.send();
   };

   var Terminal = {
      Init: function(config, fs, commands, cb) {
         this.LoadConfig(config);
         if (commands)
            this.LoadCommands(commands);
         if (fs)
            this.LoadFS(fs, cb);
         else if (cb)
            cb();
      },

      LoadFS: function(name, cb) {
         _Ajax(name, function(responseText) {
            this.fs = JSON.parse(responseText);
            this._AddDirs(this.fs, this.fs);
            if (cb) cb();
         }.bind(this));
      },

      LoadCommands: function(commands) {
         this.commands = commands;
         this.commands._terminal = this;
      },

      LoadConfig: function(config) {
         this.config = config;
      },

      Begin: function(element) {
         var parentElement = element || document.body;
         this.div = document.createElement('div');
         this.div.classList.add('jsterm');
         parentElement.appendChild(this.div);

         window.onkeydown = function(e) {
            var key = (e.which) ? e.which : e.keyCode;
            if (key == 8 || key == 9 || key == 13 || key == 46)
               e.preventDefault();
            this._HandleSpecialKey(key);
         }.bind(this);
         window.onkeypress = function(e) {
            this._TypeKey((e.which) ? e.which : e.keyCode);
         }.bind(this);

         this.ReturnHandler = this._Execute;
         this.cwd = this.fs.contents[1];
         this._Prompt();
         this._ToggleBlinker(600);
      },

      GetCWD: function() {
         var dir = this.cwd;
         var dirStr = '';
         while (this._DirNamed('..', dir.contents).contents !== dir.contents) {
            dirStr = '/' + dir.name + dirStr;
            dir = this._DirNamed('..', dir.contents);
         }
         return '~' + dirStr;
      },

      GetEntry: function(path) {
         if (!path.length)
            return null;
         var entry = this.cwd;
         if (path[0] == '~') {
            entry = this.fs;
            path = path.substring(1, path.length);
         }
         var parts = path.split('/').filter(function(x) {return x;});
         for (i in parts) {
            entry = this._DirNamed(parts[i], entry.contents);
            if (!entry)
               return null;
         }
         return entry;
      },

      Write: function(text) {
         var output = this.div.querySelector('#stdout');
         if (!output)
            return;
         output.innerHTML += text;
      },

      DefaultReturnHandler: function() {
         this.ReturnHandler = this._Execute;
      },

      TypeCommand: function(command) {
         var that = this;
         (function type(i) {
            if (i == command.length) {
               that._HandleSpecialKey(13);
            } else {
               that._TypeKey(command.charCodeAt(i));
               setTimeout(function() {
                  type(i + 1);
               }, 100);
            }
         })(0);
      },

      TabComplete: function(text) {
         var parts = text.replace(/^\s+/, '').split(' ');
         if (!parts.length)
            return [];
         var matches = [];
         if (parts.length == 1) {
            for (var c in this.commands) {
               // Private member.
               if (c[0] == '_')
                  continue;
               if (c.startswith(parts[0]) && c != parts[0])
                  matches.push(c);
            }
         } else {
            var fullPath = parts[parts.length - 1];
            var pathParts = fullPath.split('/').filter(function(x) {return x;});
            var dir = (pathParts.length > 1) ? this.GetEntry(pathParts[0]) : this.cwd;
            if (!dir)
               return [];
            var names = this._GetNamesInDir(dir);
            for (var i in names) {
               var n = names[i];
               if (n.startswith(pathParts[pathParts.length - 1]) && !n.startswith('.'))
                  matches.push(n);
            }
         }
         return matches;
      },

      _GetNamesInDir: function(dir) {
         if (dir.type != 'dir')
            return [];
         var names = [];
         for (i in dir.contents)
            names.push(dir.contents[i].name);
         return names;
      },

      _DirNamed: function(name, dir) {
         for (i in dir) {
            if (dir[i].name == name) {
               if (dir[i].type == 'link')
                  return dir[i].contents;
               else
                  return dir[i];
            }
         }
         return null;
      },

      _AddDirs: function(curDir, parentDir) {
         curDir.contents.forEach(function(entry, i, dir) {
            if (entry.type == 'dir')
               this._AddDirs(entry, curDir);
         }.bind(this));
         curDir.contents.push({
            'name': '.',
            'type': 'link',
            'contents': curDir
         });
         curDir.contents.push({
            'name': '..',
            'type': 'link',
            'contents': parentDir
         });
      },

      _ToggleBlinker: function(timeout) {
         var blinker = this.div.querySelector('#blinker');
         if (blinker) {
            blinker.parentNode.removeChild(blinker);
         } else {
            var stdout = this.div.querySelector('#stdout');
            blinker = document.createElement('span');
            blinker.id = 'blinker';
            blinker.innerHTML = '&#x2588';
            stdout.parentNode.appendChild(blinker);
         }
         if (timeout) {
            setTimeout(function() {
               this._ToggleBlinker(timeout);
            }.bind(this), timeout);
         }
      },

      _ResetID: function(query) {
         var element = this.div.querySelector(query);
         if (element)
            element.removeAttribute('id');
      },

      _Prompt: function() {
         this._ResetID('#currentPrompt');
         var div = document.createElement('div');
         this.div.appendChild(div);

         var prompt = document.createElement('span');
         prompt.classList.add('prompt');
         prompt.id = 'currentPrompt';
         prompt.innerHTML = this.config.prompt(this.GetCWD());
         div.appendChild(prompt);

         this._ResetID('#stdout');
         var command = document.createElement('span');
         command.classList.add('command');
         command.id = 'stdout';
         div.appendChild(command);
         this._ToggleBlinker(0);
      },

      _TypeKey: function(key) {
         var stdout = this.div.querySelector('#stdout');
         if (!stdout || key < 0x20 || key > 0x7E || key == 13 || key == 9)
            return;
         var letter = String.fromCharCode(key);
         stdout.innerHTML += letter;
      },

      _HandleSpecialKey: function(key, e) {
         var stdout = this.div.querySelector('#stdout');
         if (!stdout)
            return;
         if (key == 8 || key == 46)
            stdout.innerHTML = stdout.innerHTML.replace(/.$/, '');
         else if (key == 13)
            this.ReturnHandler(stdout.innerHTML);
         else if (key == 9) {
            matches = this.TabComplete(stdout.innerHTML);
            if (matches.length) {
               var parts = stdout.innerHTML.split(' ');
               var pathParts = parts[parts.length - 1].split('/');
               pathParts[pathParts.length - 1] = matches[0];
               parts[parts.length - 1] = pathParts.join('/');
               stdout.innerHTML = parts.join(' ');
            }
         }
      },

      _Execute: function(fullCommand) {
         this._ResetID('#stdout');
         var output = document.createElement('div');
         output.id = 'stdout';
         this.div.appendChild(output);

         var parts = fullCommand.split(' ').filter(function(x) {return x;});
         var command = parts[0];
         var args = parts.slice(1, parts.length);
         if (command && command.length) {
            if (!(command in this.commands)) {
               this.Write(command + ': command not found');
               this._Prompt();
            } else {
               this.commands[command](args, function() {
                  this._Prompt()
               }.bind(this));
            }
         } else {
            this._Prompt()
         }
         this.DefaultReturnHandler();
      },

      ReturnHandler: null,
      fs: null,
      cwd: null
   };

   String.prototype.startswith = function(s) {
      return this.indexOf(s) == 0;
   }

   var term = Object.create(Terminal);
   term.Init(CONFIG, '/json/fs1.json', COMMANDS, function() {
      term.Begin();
   });

   window.TypeCommand = function(command) {
      term.TypeCommand(command);
   };
})();
