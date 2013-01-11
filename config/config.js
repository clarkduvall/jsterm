var CONFIG = CONFIG || {};

CONFIG.prompt = function(cwd, user) {
   if (user)
      return '<span class="user">' + user +
          '</span>@<span class="host">clarkduvall.com</span>:<span class="cwd">' +
          cwd + '</span>$ ';
   return 'jsterm1.0 $ ';
};

CONFIG.username = '';
