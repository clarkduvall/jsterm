(function() {
   if (typeof Object.create !== 'function') {
      Object.create = function (o) {
         function F() {}
         F.prototype = o;
         return new F();
      };
   }

   if (!Function.prototype.bind) {
      Function.prototype.bind = function (oThis) {
         if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
         }

         var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
               return fToBind.apply(this instanceof fNOP && oThis
                                      ? this
                                      : oThis,
                                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

         fNOP.prototype = this.prototype;
         fBound.prototype = new fNOP();

         return fBound;
      };
   }

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
         this._queue = [];
         this._history = [];
         this._historyIndex = -1;
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
            if (key == 8 || key == 9 || key == 13 || key == 46 || key == 38 ||
                key == 40 || e.ctrlKey)
               e.preventDefault();
            this._HandleSpecialKey(key, e);
         }.bind(this);
         window.onkeypress = function(e) {
            this._TypeKey((e.which) ? e.which : e.keyCode);
         }.bind(this);

         this.ReturnHandler = this._Execute;
         this.cwd = this.fs;
         this._Prompt();
         this._ToggleBlinker(600);
         this._Dequeue();
      },

      GetCWD: function() {
         return this.DirString(this.cwd);
      },

      DirString: function(d) {
         var dir = d;
         var dirStr = '';
         while (this._DirNamed('..', dir.contents).contents !== dir.contents) {
            dirStr = '/' + dir.name + dirStr;
            dir = this._DirNamed('..', dir.contents);
         }
         return '~' + dirStr;
      },

      GetEntry: function(path) {
         if (!path)
            return null;
         path = path.replace(/^\s+/, '').replace(/\s+$/, '');
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
         var output = this.Stdout();
         if (!output)
            return;
         output.innerHTML += text;
      },

      DefaultReturnHandler: function() {
         this.ReturnHandler = this._Execute;
      },

      TypeCommand: function(command, cb) {
         var that = this;
         (function type(i) {
            if (i == command.length) {
               that._HandleSpecialKey(13);
               if (cb) cb();
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
            // TODO: Combine with below.
            var pathParts = parts[0].replace(/[\/]+/, '/').split('/');
            var last = pathParts.pop();
            var dir = (pathParts.length > 0) ? this.GetEntry(pathParts.join('/')) : this.cwd;
            if (dir) {
               for (var i in dir.contents) {
                  var n = dir.contents[i].name;
                  if (n.startswith(last) && !n.startswith('.') && n != last) {
                     if (dir.contents[i].type == 'exec')
                        matches.push(n + ' ');
                  }
               }
            }
            for (var c in this.commands) {
               // Private member.
               if (c[0] == '_')
                  continue;
               if (c.startswith(parts[0]) && c != parts[0])
                  matches.push(c + ' ');
            }
         } else {
            var fullPath = parts[parts.length - 1];
            var pathParts = fullPath.replace(/[\/]+/, '/').split('/');
            var last = pathParts.pop();
            var dir = (pathParts.length > 0) ? this.GetEntry(pathParts.join('/')) : this.cwd;
            if (!dir)
               return [];
            for (var i in dir.contents) {
               var n = dir.contents[i].name;
               if (n.startswith(last) && !n.startswith('.') && n != last) {
                  if (dir.contents[i].type == 'dir')
                     matches.push(n + '/');
                  else
                     matches.push(n + ' ');
               }
            }
         }
         return matches;
      },

      Enqueue: function(command) {
         this._queue.push(command);
      },

      Scroll: function() {
         window.scrollTo(0, document.body.scrollHeight);
      },

      ParseArgs: function(argv) {
         var args = [];
         var filenames = [];
         for (i in argv) {
            if (argv[i].startswith('-')) {
               var opts = argv[i].substring(1);
               for (var j = 0; j < opts.length; j++)
                  args.push(opts.charAt(j));
            } else {
               filenames.push(argv[i]);
            }
         }
         return { 'filenames': filenames, 'args': args };
      },

      WriteLink: function(e, str) {
         this.Write('<span class="' + e.type + '">' + this._CreateLink(e, str) +
             '</span>');
      },

      Stdout: function() {
         return this.div.querySelector('#stdout');
      },

      NewStdout: function() {
         var stdout = this.Stdout();
         this._ResetID('#stdout');
         var newStdout = document.createElement('span');
         newStdout.id = 'stdout';
         stdout.parentNode.insertBefore(newStdout, stdout.nextSibling);
      },

      _CreateLink: function(entry, str) {
         function TypeLink(text, link) {
            return '<a href="javascript:void(0)" onclick="TypeCommand(\'' +
                text + '\')">' + link + '</a>';
         };
         if (entry.type == 'dir' || entry.type == 'link')
            return TypeLink('ls -l ' + str, entry.name);
         else if (entry.type == 'text')
            return TypeLink('cat ' + str, entry.name);
         else if (entry.type == 'img')
            return TypeLink('gimp ' + str, entry.name);
         else if (entry.type == 'exec')
            return '<a href="' + entry.contents + '" target="_blank">' +
                entry.name + '</a>';
      },

      _Dequeue: function() {
         if (!this._queue.length)
            return;
         this.TypeCommand(this._queue.shift(), function() {
            this._Dequeue()
         }.bind(this));
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
         curDir.contents.unshift({
            'name': '..',
            'type': 'link',
            'contents': parentDir
         });
         curDir.contents.unshift({
            'name': '.',
            'type': 'link',
            'contents': curDir
         });
      },

      _ToggleBlinker: function(timeout) {
         var blinker = this.div.querySelector('#blinker');
         if (blinker) {
            blinker.parentNode.removeChild(blinker);
         } else {
            var stdout = this.Stdout();
            if (stdout) {
               blinker = document.createElement('span');
               blinker.id = 'blinker';
               blinker.innerHTML = '&#x2588';
               stdout.parentNode.appendChild(blinker);
            }
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
         prompt.innerHTML = this.config.prompt(this.GetCWD(), this.config.username);
         div.appendChild(prompt);

         this._ResetID('#stdout');
         var command = document.createElement('span');
         command.classList.add('command');
         command.id = 'stdout';
         div.appendChild(command);
         this._ToggleBlinker(0);
         this.Scroll();
      },

      _TypeKey: function(key) {
         var stdout = this.Stdout();
         if (!stdout || key < 0x20 || key > 0x7E || key == 13 || key == 9)
            return;
         var letter = String.fromCharCode(key);
         stdout.innerHTML += letter;
      },

      _HandleSpecialKey: function(key, e) {
         var stdout = this.Stdout();
         if (!stdout)
            return;
         // Backspace/delete.
         if (key == 8 || key == 46)
            stdout.innerHTML = stdout.innerHTML.replace(/.$/, '');
         // Enter.
         else if (key == 13)
            this.ReturnHandler(stdout.innerHTML);
         // Up arrow.
         else if (key == 38) {
            if (this._historyIndex < this._history.length - 1)
               stdout.innerHTML = this._history[++this._historyIndex];
         // Down arrow.
         } else if (key == 40) {
            if (this._historyIndex <= 0) {
               if (this._historyIndex == 0)
                  this._historyIndex--;
               stdout.innerHTML = '';
            }
            else if (this._history.length)
               stdout.innerHTML = this._history[--this._historyIndex];
         // Tab.
         } else if (key == 9) {
            matches = this.TabComplete(stdout.innerHTML);
            if (matches.length) {
               var parts = stdout.innerHTML.split(' ');
               var pathParts = parts[parts.length - 1].split('/');
               pathParts[pathParts.length - 1] = matches[0];
               parts[parts.length - 1] = pathParts.join('/');
               stdout.innerHTML = parts.join(' ');
            }
         // Ctrl+C, Ctrl+D.
         } else if ((key == 67 || key == 68) && e.ctrlKey) {
            if (key == 67)
               this.Write('^C');
            this.DefaultReturnHandler();
            this._Prompt();
         }
      },

      _Execute: function(fullCommand) {
         this._ResetID('#stdout');
         var output = document.createElement('div');
         var stdout = document.createElement('span');
         stdout.id = 'stdout';
         output.appendChild(stdout);
         this.div.appendChild(output);

         var parts = fullCommand.split(' ').filter(function(x) {return x;});
         var command = parts[0];
         var args = parts.slice(1, parts.length);
         var entry = this.GetEntry(fullCommand);
         if (command && command.length) {
            if (command in this.commands) {
               this.commands[command](args, function() {
                  this.DefaultReturnHandler();
                  this._Prompt()
               }.bind(this));
            } else if (entry && entry.type == 'exec') {
               window.open(entry.contents, '_blank');
               this._Prompt();
            } else {
               this.Write(command + ': command not found');
               this._Prompt();
            }
         } else {
            this._Prompt()
         }
         if (fullCommand.length)
            this._history.unshift(fullCommand);
         this._historyIndex = -1;
      }
   };

   String.prototype.startswith = function(s) {
      return this.indexOf(s) == 0;
   }

   var term = Object.create(Terminal);
   term.Init(CONFIG, '/json/sample.json', COMMANDS, function() {
      term.Enqueue('login');
      term.Enqueue('clark');
      term.Enqueue('******');
      term.Enqueue('cat README');
      term.Enqueue('help');
      term.Enqueue('cd projects');
      term.Enqueue('ls -l');
      term.Enqueue('cd ..');
      term.Enqueue('tree');
      term.Enqueue('ls');
      term.Begin();
   });

   window.TypeCommand = function(command) {
      term.TypeCommand(command);
   };
})();
