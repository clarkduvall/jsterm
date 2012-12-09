(function() {
   var Terminal = {
      LoadFS: function(name, callback) {
         var ajax = new XMLHttpRequest();
         var that = this;
         ajax.onreadystatechange = function() {
            if (ajax.readyState == 4 && ajax.status == 200) {
               that.fs = JSON.parse(ajax.responseText);
               callback();
            }
         };
         ajax.open('GET', name);
         ajax.send();
      },
      fs: null
   };

   var term = Object.create(Terminal);
   term.LoadFS('http://localhost:8000/json/fs1.json', function() {
      console.log(term.fs);
   });
})();
