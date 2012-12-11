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
         this.commands.terminal = this;
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
            this._HandleSpecialKey((e.which) ? e.which : e.keyCode);
         }.bind(this);
         window.onkeypress = function(e) {
            this._TypeKey((e.which) ? e.which : e.keyCode);
         }.bind(this);

         this.cwd = this.fs.contents[1];
         this._Prompt();
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
            return false;
         var entry = this.cwd;
         if (path[0] == '~') {
            entry = this.fs;
            path = path.substring(1, path.length);
         }
         var parts = path.split('/');
         for (i in parts) {
            if (!parts[i].length)
               continue;
            entry = this._DirNamed(parts[i], entry.contents);
            if (!entry)
               return false;
         }
         return entry;
      },

      Write: function(text) {
         var output = this.div.querySelector('#output');
         if (!output)
            return;
         output.innerHTML += text;
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
         return false;
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

      _ResetID: function(query) {
         var element = this.div.querySelector(query);
         if (element)
            element.removeAttribute('id');
      },

      _Prompt: function() {
         this._ResetID('#current_Prompt');
         var div = document.createElement('div');
         this.div.appendChild(div);

         var prompt = document.createElement('span');
         prompt.classList.add('prompt');
         prompt.id = 'current_Prompt';
         prompt.innerHTML = this.config.prompt + ':' + this.GetCWD() + '$ ';
         div.appendChild(prompt);

         this._ResetID('#currentCommand');
         var command = document.createElement('span');
         command.classList.add('command');
         command.id = 'currentCommand';
         div.appendChild(command);

         this._ResetID('#output');
         var output = document.createElement('div');
         output.id = 'output';
         this.div.appendChild(output);
      },

      _TypeKey: function(key) {
         var command = this.div.querySelector('#currentCommand');
         if (!command || key < 0x20 || key > 0x7E || key == 13 || key == 9)
            return;
         var letter = String.fromCharCode(key);
         command.innerHTML += letter;
      },

      _HandleSpecialKey: function(key) {
         var command = this.div.querySelector('#currentCommand');
         if (!command)
            return;
         if (key == 8 || key == 46)
            command.innerHTML = command.innerHTML.replace(/.$/, '');
         else if (key == 13)
            this._Execute(command.innerHTML);
      },

      _Execute: function(command) {
         var parts = command.split(' ');
         if (parts[0].length) {
            if (!(parts[0] in this.commands))
               this.Write('Command not found!');
            else
               this.commands[parts[0]](parts.slice(1, parts.length));
         }
         this._Prompt();
      },

      fs: null,
      cwd: null
   };

   var term = Object.create(Terminal);
   term.Init(CONFIG, '/json/fs1.json', COMMANDS, function() {
      term.Begin();
   });
})();
