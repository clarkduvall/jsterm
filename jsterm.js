(function() {
   function Ajax(name, callback) {
      var ajax = new XMLHttpRequest();
      ajax.onreadystatechange = function() {
         if (ajax.readyState == 4 && ajax.status == 200)
            callback(ajax.responseText);
      };
      ajax.open('GET', name);
      ajax.send();
   };

   var Terminal = {
      LoadFS: function(name) {
         var that = this;
         Ajax(name, function(responseText) {
            that.fs = JSON.parse(responseText);
         });
      },
      fs: null
   };

   var term = Object.create(Terminal);
   term.LoadFS('/json/fs1.json');
})();
