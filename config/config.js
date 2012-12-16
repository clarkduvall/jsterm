var CONFIG = CONFIG || {};

CONFIG.prompt = function(cwd, user) {
   if (user)
      return '<span class="user">' + user +
          '@clarkduvall.com</span>:<span class="dir">' + cwd + '</span>$ ';
   return 'jsterm1.0 $ ';
};

CONFIG.username = '';
