// Copyright 2013 Clark DuVall
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var COMMANDS = COMMANDS || {};

COMMANDS.cat = function(argv, cb) {
    var filenames = this._terminal.parseArgs(argv).filenames, 
    stdout;
    
    this._terminal.scroll();
    if (!filenames.length) {
        this._terminal.returnHandler = function() {
            stdout = this.stdout();
            if (!stdout)
                return;
            stdout.innerHTML += '<br>' + stdout.innerHTML + '<br>';
            this.scroll();
            this.newStdout();
        }
        .bind(this._terminal);
        return;
    }
    filenames.forEach(function(filename, i) {
        var entry = this._terminal.getEntry(filename);
        
        if (!entry)
            this._terminal.write('cat: ' + filename + ': No such file or directory');
        else if (entry.type === 'dir')
            this._terminal.write('cat: ' + filename + ': Is a directory.');
        else
            this._terminal.write(entry.contents);
        if (i !== filenames.length - 1)
            this._terminal.write('<br>');
    }
    , this);
    cb();
}

COMMANDS.cd = function(argv, cb) {
    var filename = this._terminal.parseArgs(argv).filenames[0], 
    entry;
    
    if (!filename)
        filename = '~';
    entry = this._terminal.getEntry(filename);
    if (!entry)
        this._terminal.write('cd: ' + filename + ': No such file or directory');
    else if (entry.type !== 'dir')
        this._terminal.write('cd: ' + filename + ': Not a directory.');
    else
        this._terminal.cwd = entry;
    cb();
}

COMMANDS.ls = function(argv, cb) {
    var result = this._terminal.parseArgs(argv), 
    args = result.args, 
    filename = result.filenames[0], 
    entry = filename ? this._terminal.getEntry(filename) : this._terminal.cwd, 
    maxLen = 0, 
    writeEntry;
    
    writeEntry = function(e, str) {
        this.writeLink(e, str);
        if (args.indexOf('l') > -1) {
            if ('description' in e)
                this.write(' - ' + e.description);
            this.write('<br>');
        } else {
            // Make all entries the same width like real ls. End with a normal
            // space so the line breaks only after entries.
            this.write(Array(maxLen - e.name.length + 2).join('&nbsp') + ' ');
        }
    }
    .bind(this._terminal);
    
    if (!entry)
        this._terminal.write('ls: cannot access ' + filename + ': No such file or directory');
    else if (entry.type === 'dir') {
        var dirStr = this._terminal.dirString(entry);
        maxLen = entry.contents.reduce(function(prev, cur) {
            return Math.max(prev, cur.name.length);
        }
        , 0);
        
        for (var i in entry.contents) {
            var e = entry.contents[i];
            if (args.indexOf('a') > -1 || e.name[0] !== '.')
                writeEntry(e, dirStr + '/' + e.name);
        }
    } else {
        maxLen = entry.name.length;
        writeEntry(entry, filename);
    }
    cb();
}

COMMANDS.gimp = function(argv, cb) {
    var filename = this._terminal.parseArgs(argv).filenames[0], 
    entry, 
    imgs;
    
    if (!filename) {
        this._terminal.write('gimp: please specify an image file.');
        cb();
        return;
    }
    
    entry = this._terminal.getEntry(filename);
    if (!entry || entry.type !== 'img') {
        this._terminal.write('gimp: file ' + filename + ' is not an image file.');
    } else {
        this._terminal.write('<img src="' + entry.contents + '"/>');
        imgs = this._terminal.div.getElementsByTagName('img');
        imgs[imgs.length - 1].onload = function() {
            this.scroll();
        }
        .bind(this._terminal);
        if ('caption' in entry)
            this._terminal.write('<br/>' + entry.caption);
    }
    cb();
}

COMMANDS.clear = function(argv, cb) {
    this._terminal.div.innerHTML = '';
    cb();
}

COMMANDS.sudo = function(argv, cb) {
    var count = 0;
    this._terminal.returnHandler = function() {
        if (++count < 3) {
            this.write('<br/>Sorry, try again.<br/>');
            this.write('[sudo] password for ' + this.config.username + ': ');
            this.scroll();
        } else {
            this.write('<br/>sudo: 3 incorrect password attempts');
            cb();
        }
    }
    .bind(this._terminal);
    this._terminal.write('[sudo] password for ' + this._terminal.config.username + ': ');
    this._terminal.scroll();
}

COMMANDS.login = function(argv, cb) {
    this._terminal.returnHandler = function() {
        var username = this.stdout().innerHTML;
        
        this.scroll();
        if (username)
            this.config.username = username;
        this.write('<br>Password: ');
        this.scroll();
        this.returnHandler = function() {
            cb();
        }
    }
    .bind(this._terminal);
    this._terminal.write('Username: ');
    this._terminal.newStdout();
    this._terminal.scroll();
}

COMMANDS.tree = function(argv, cb) {
    var term = this._terminal, 
    home;
    
    function writeTree(dir, level) {
        dir.contents.forEach(function(entry) {
            var str = '';
            
            if (entry.name.startswith('.'))
                return;
            for (var i = 0; i < level; i++)
                str += '|  ';
            str += '|&mdash;&mdash;';
            term.write(str);
            term.writeLink(entry, term.dirString(dir) + '/' + entry.name);
            term.write('<br>');
            if (entry.type === 'dir')
                writeTree(entry, level + 1);
        }
        );
    }
    ;
    home = this._terminal.getEntry('~');
    this._terminal.writeLink(home, '~');
    this._terminal.write('<br>');
    writeTree(home, 0);
    cb();
}

COMMANDS.help = function(argv, cb) {
    this._terminal.write(
    'You can navigate either by clicking on anything that ' + 
    '<a href="javascript:void(0)">underlines</a> when you put your mouse ' + 
    'over it, or by typing commands in the terminal. Type the name of a ' + 
    '<span class="exec">link</span> to view it. Use "cd" to change into a ' + 
    '<span class="dir">directory</span>, or use "ls" to list the contents ' + 
    'of that directory. The contents of a <span class="text">file</span> ' + 
    'can be viewed using "cat". <span class="img">Images</span> are ' + 
    'displayed using "gimp".<br><br>If there is a command you want to get ' + 
    'out of, press Ctrl+C or Ctrl+D.<br><br>');
    this._terminal.write('Commands are:<br>');
    for (var c in this._terminal.commands) {
        if (this._terminal.commands.hasOwnProperty(c) && !c.startswith('_'))
            this._terminal.write(c + '  ');
    }
    cb();
}


// Copyright 2015 Yanbin MA (yianbin@gmail.com)
// The following code is written by Yanbin MA
// Enjoy it!
COMMANDS.whoami = function(argv, cb) {
    this._terminal.write(this._terminal.config.username);
    cb();
}

COMMANDS.pwd = function(argv, cb) {
    var pwd = this._terminal.getCWD();
    pwd = pwd.replace(/^~/, '/home/' + this._terminal.config.username);
    this._terminal.write(pwd);
    cb();
}

COMMANDS.fortune = function(argv, cb) {
    var database = [
    "A career is great, but you can't run your fingers through its hair.", 
    "Always there remain portions of our heart into which no one is able to enter, invite them as we may.", 
    "Lonely is a man without love.<br>        -- Englebert Humperdinck", 
    "Fat people of the world unite, we've got nothing to lose!", 
    "I don't care where I sit as long as I get fed.<br>        -- Calvin Trillin", 
    "Waiter: \"Tea or coffee, gentlemen?\"<br>1st customer: \"I'll have tea.\"<br>2nd customer: \"Me, too -- and be sure the glass is clean!\"<br>        (Waiter exits, returns)<br>Waiter: \"Two teas.  Which one asked for the clean glass?\"", 
    "Between grand theft and a legal fee, there only stands a law degree.", 
    "Why does New Jersey have more toxic waste dumps and California have more lawyers?<br><br>New Jersey had first choice.", 
    "A 'full' life in my experience is usually full only of other people's demands.", 
    "A city is a large community where people are lonesome together<br>        -- Herbert Prochnow", 
    "A real person has two reasons for doing anything ... a good reason and the real reason.", 
    "After living in New York, you trust nobody, but you believe everything. Just in case.", 
    "All men have the right to wait in line.", 
    "People respond to people who respond.", 
    "A boy gets to be a man when a man is needed.<br>        -- John Steinbeck", 
    "A beautiful man is paradise for the eyes, hell for the soul, and purgatory for the purse.", 
    "How beautiful are thy feet with shoes, O prince's daughter! the joints of thy thighs are like jewels, the work of the hands of a cunning workman.  Thy navel is like a round goblet, which wanteth not liquor:  thy belly is like an heap of wheat set about with lillies. Thy two breasts are like two young roses that are twins.<br>[Song of Solomon 7:1-3 (KJV)]", 
    "!07/11 PDP a ni deppart m'I  !pleH", 
    "1: No code table for op: ++post", 
    "A LISP programmer knows the value of everything, but the cost of nothing.<br>        -- Alan Perlis", 
    "Remember: use logout to logout.", 
    "Except for 75% of the women, everyone in the whole world wants to have sex.<br>        -- Ellyn Mustard", 
    "FORTUNE DISCUSSES THE OBSCURE FILMS: #3<br><br>MIRACLE ON 42ND STREET:<br>    Santa Claus, in the off season, follows his heart's desire and tries to make it big on Broadway.<br>    Santa sings and dances his way into your heart.", 
    "(1) Everything depends.<br>(2) Nothing is always.<br>(3) Everything is sometimes.", 
    "A friend in need is a pest indeed.", 
    "(1) Avoid fried meats which angry up the blood.<br>(2) If your stomach antagonizes you, pacify it with cool thoughts.<br>(3) Keep the juices flowing by jangling around gently as you move.<br>(4) Go very lightly on the vices, such as carrying on in society, as the social ramble ain't restful.<br>(5) Avoid running at all times.<br>(6) Don't look back, something might be gaining on you.<br>        -- S. Paige, c. 1951", 
    "All is fear in love and war.", 
    "Death is Nature's way of recycling human beings.", 
    "Death is only a state of mind."
    ];
    
    var rand = parseInt(Math.random() * database.length);
    this._terminal.write(database[rand]);
    cb();
}

COMMANDS.date = function(argv, cb) {
    this._terminal.write(new Date().toUTCString());
    cb();
}

COMMANDS.cal = function(argv, cb) {
    var month, year, localtime = new Date();
    switch (argv.length) {
    case 2:
        month = parseInt(argv[0]) - 1;
        if (month < 1 || 12 < month) {
            this._terminal.write('cal: illegal month value: use 1-12');
            cb();
            return;
        }
        year = parseInt(argv[1]);
        if (year < 1 || 9999 < year) {
            this._terminal.write('cal: illegal year value: use 1-9999');
            cb();
            return;
        }
        break;
    case 0:
        month = localtime.getMonth();
        year = localtime.getFullYear();
        break;
    default:
        this._terminal.write('cal: usage: cal [month year]');
        cb();
        return;
    }
    
    var amonth = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
    ]
      , aday = [
    '', 
    ' 1', ' 2', ' 3', ' 4', ' 5', ' 6', ' 7', 
    ' 8', ' 9', '10', '11', '12', '13', '14', 
    '15', '16', '17', '18', '19', '20', '21', 
    '22', '23', '24', '25', '26', '27', '28', 
    '29', '30', '31'
    ];
    
    if (month == localtime.getMonth() && year == localtime.getFullYear()) {
        aday[localtime.getDate()] = '<span class="exec">' + aday[localtime.getDate()] + '</span>';
    }
    
    var table = []
      , 
    weekday = new Date(year,month,1).getDay()
      , 
    days = new Date(year,month + 1,0).getDate();
    while (weekday--) {
        table.push('  ');
    }
    for (var i = 1; i <= days; i++) {
        table.push(aday[i]);
    }
    // September 1752 is a special
    if (month == 8 && year == 1752) {
        table = [
        '  ', '  ', '01', '02', '14', '15', '16', 
        '17', '18', '19', '20', '21', '22', '23', 
        '24', '25', '26', '27', '28', '29', '30'
        ];
    }
    
    var header = amonth[month] + ' ' + year
      , 
    padding = parseInt((20 - header.length) / 2);
    while (padding--) {
        this._terminal.write(' ');
    }
    this._terminal.write(header + '<br>');
    this._terminal.write('Su Mo Tu We Th Fr Sa<br>');
    var len = table.length
      , tables = []
      , i = 0;
    while (i < len) {
        tables.push(table.slice(i, i += 7));
    }
    tables.forEach(function(line) {
        this._terminal.write(line.join(' ') + '<br>');
    }
    , this);
    this._terminal.write('<br>');
    cb();
}

COMMANDS.echo = function(argv, cb) {
    var string = this._terminal.parseArgs(argv).filenames.join(' ')
      , 
    args = this._terminal.parseArgs(argv).args;
    if (args.length > 1 && args[0] == '>') {
        var entry = {
            'name': args[1].match(/[^/]+$/)[0],
            'type': 'text',
            'contents': string,
            'description': 'No description'
        };
        this._terminal.writeFile(entry, args[1]);
    } else {
        this._terminal.write(string);
    }
    cb();
}


COMMANDS.history = function(argv, cb) {
    this._terminal._history.reverse().forEach(function(command, index) {
        if (index < 10)
            this._terminal.write(' ');
        this._terminal.write(index + '  ' + command + '<br>');
    }
    , this);
    cb();
}

COMMANDS.matrix = function(argv, cb) {
    this._terminal.fullScreen();
    var matrix = document.createElement('ul');
    matrix.classList.add('matrix');
    var s = '<li></li>'
      , i = 128;
    while (i--)
        s += '<li></li>';
    matrix.innerHTML = s;
    document.getElementById('screen').appendChild(matrix);
}

COMMANDS.ascii = function(argv, cb) {
    this._terminal.write('Dec Hex    Dec Hex    Dec Hex  Dec Hex  Dec Hex  Dec Hex   Dec Hex   Dec Hex<br>');
    this._terminal.write('  0 00 NUL  16 10 DLE  32 20    48 30 0  64 40 @  80 50 P   96 60 `  112 70 p<br>');
    this._terminal.write('  1 01 SOH  17 11 DC1  33 21 !  49 31 1  65 41 A  81 51 Q   97 61 a  113 71 q<br>');
    this._terminal.write('  2 02 STX  18 12 DC2  34 22 "  50 32 2  66 42 B  82 52 R   98 62 b  114 72 r<br>');
    this._terminal.write('  3 03 ETX  19 13 DC3  35 23 #  51 33 3  67 43 C  83 53 S   99 63 c  115 73 s<br>');
    this._terminal.write('  4 04 EOT  20 14 DC4  36 24 $  52 34 4  68 44 D  84 54 T  100 64 d  116 74 t<br>');
    this._terminal.write('  5 05 ENQ  21 15 NAK  37 25 %  53 35 5  69 45 E  85 55 U  101 65 e  117 75 u<br>');
    this._terminal.write('  6 06 ACK  22 16 SYN  38 26 &  54 36 6  70 46 F  86 56 V  102 66 f  118 76 v<br>');
    this._terminal.write('  7 07 BEL  23 17 ETB  39 27 \'  55 37 7  71 47 G  87 57 W  103 67 g  119 77 w<br>');
    this._terminal.write('  8 08 BS   24 18 CAN  40 28 (  56 38 8  72 48 H  88 58 X  104 68 h  120 78 x<br>');
    this._terminal.write('  9 09 HT   25 19 EM   41 29 )  57 39 9  73 49 I  89 59 Y  105 69 i  121 79 y<br>');
    this._terminal.write(' 10 0A LF   26 1A SUB  42 2A *  58 3A :  74 4A J  90 5A Z  106 6A j  122 7A z<br>');
    this._terminal.write(' 11 0B VT   27 1B ESC  43 2B +  59 3B ;  75 4B K  91 5B [  107 6B k  123 7B {<br>');
    this._terminal.write(' 12 0C FF   28 1C FS   44 2C ,  60 3C &lt;  76 4C L  92 5C \\  108 6C l  124 7C |<br>');
    this._terminal.write(' 13 0D CR   29 1D GS   45 2D -  61 3D =  77 4D M  93 5D ]  109 6D m  125 7D }<br>');
    this._terminal.write(' 14 0E SO   30 1E RS   46 2E .  62 3E &gt;  78 4E N  94 5E ^  110 6E n  126 7E ~<br>');
    this._terminal.write(' 15 0F SI   31 1F US   47 2F /  63 3F ?  79 4F O  95 5F _  111 6F o  127 7F DEL<br>');
    cb();
}

COMMANDS.todo = function(argv, cb) {
    switch (argv.length) {
    case 0:
        if (window.localStorage.hasOwnProperty('td')) {
            var data = JSON.parse(window.localStorage.getItem('td'));
            for (var i = 0; i < data.todo.length; i++) {
                this._terminal.write('<span class="orange">' + parseInt(i + 1) + '. ' + data.todo[i] + '</span><br>');
            }
        } else {
            this._terminal.write('todo: 0 item');
        }
        cb();
        return;
    case 1:
        if (argv[0] == 'reset') {
            this._terminal.returnHandler = function () {
                this.write('Do you want reset todo list (y/n): ');
                this.scroll();
                window.localStorage.removeItem('td');
            }
            .bind(this._terminal);
        }
    case 2:
        if (argv[0] == 'done' && !isNaN(argv[1])) {
            if (window.localStorage.hasOwnProperty('td')) {
                var id = parseInt(argv[1]) - 1, data = JSON.parse(window.localStorage.getItem('td'));
                if (id >= 0 && data.todo.length >= id) {
                    var item = data.todo.splice(id, 1);
                    data.done.push(item);
                    window.localStorage.setItem('td', JSON.stringify(data));
                }
            }
            cb ();
            return;
        } else if (argv[0] == 'delete' && !isNaN(argv[1])) {
            // TODO
            cb();
            return;
        } else if (argv[0] == 'reset') {
            window.localStorage.removeItem('td');
            cb();
            return;
        }
    default:
        if (argv.length >1 && argv[0] == 'add') {
            if (!window.localStorage.hasOwnProperty('td')) {
                window.localStorage.setItem('td', JSON.stringify({
                    'todo': [],
                    'done': []
                }));
            }
            var data = JSON.parse(window.localStorage.getItem('td'));
            data.todo.push(argv.slice(1).join(' ').trim());
            window.localStorage.setItem('td', JSON.stringify(data));
            cb();
            return;
        }
        this._terminal.write('todo: invalid arguments');
        cb();
        return;
    }
}

COMMANDS.google = function(argv, cb) {
    var that = this;
    var timestamp = new Date().getTime();
    var q = this._terminal.parseArgs(argv).filenames.join(' ');
    if (q == '') {
        this._terminal.write('google: invalid arguments');
        cb();
        return;
    }
    this._terminal.write('  <span class="blue">___</span>                <span class="green">_</span> <br>');
    this._terminal.write(' <span class="blue">/ __|</span><span class="red">___</span>  <span class="yellow">___</span>  <span class="blue">__</span> _<span class="green">| |<span><span class="red">___</span><br>');
    this._terminal.write('<span class="blue">| (_</span> <span class="red">/ _ \\</span><span class="yellow">/ _ \\</span><span class="blue">/ _`</span> <span class="green">|</span>   <span class="red">-_)</span><br>');
    this._terminal.write(' <span class="blue">\\___</span><span class="red">\\___/</span><span class="yellow">\\___/</span><span class="blue">\\__,</span> <span class="green">|_</span><span class="red">\\___|</span><br>');
    this._terminal.write('               <span class="blue">|___/</span><br>');

    url = 'http://jsonpwrapper.com/?urls%5B%5D=http%3A%2F%2Fcmd.to%2Fapi%2Fv1%2Fapps%2Fcmd%2Fsearch%2F';
    $.ajax({
        type: 'get',
        url: url + encodeURI(encodeURI(q)),
        dataType: 'jsonp'

    }).done(function (data) {
        var data = JSON.parse(data[0].body);
        var goog = [];

        goog = goog.concat(data.datas[0].responseData.results);
        goog = goog.concat(data.datas[1].responseData.results);
        // goog = goog.concat(data.datas[2].responseData.results);

        for (var i = 0; i < goog.length; i++) {
            var s = '<pre class="google">' + i + ': <a href="' + goog[i].url +'">' + goog[i].title +
                    ' <i>(' + goog[i].visibleUrl + ')</i></a><br>' + goog[i].content + '</pre>';
            that._terminal.write(s);
        }
    }).fail(function () {
        that._terminal.writing('google: Network connect error');
    }).always(function () {
        cb();
    });

}
