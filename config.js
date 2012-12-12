var CONFIG = CONFIG || {};

CONFIG.prompt = function(cwd) {
  return '<span class="user">clark@clarks-comp</span>:<span class="dir">' +
      cwd + '</span>$ ';
};
