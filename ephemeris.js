/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

function split(line, widths) {
  var fields = [];
  var n = 0;
  while (line.length > 0) {
    var width = widths[n++];
    var field = line.substr(0, width);
    line = line.substr(width);
    fields.push(field);
  }
  return fields;
}

function parseNumber(value) {
  return value.replace('D', 'e').trim() - 0;
}

function parseRecord(lines) {
  for (var n = 0; n < lines.length; ++n)
    lines[n] = split(lines[n], [22, 19, 19, 19]);
  // parse prn and epoch
  var h = lines[0][0].substr(0, 60).replace(/ +(?= )/g,'').trim().split(' ');
  var eph = {
    Prn: h[0],
    Toc: new Date(Date.UTC((h[1]|0) + 2000, (h[2]|0)-1, h[3]|0, h[4]|0, h[5]|0, h[6]-0)),
    Af0: parseNumber(lines[0][1]),
    Af1: parseNumber(lines[0][2]),
    Af2: parseNumber(lines[0][3]),
  };
  var fields = [null,
                ['Iode','Crs','DeltaN','M0'],
                ['Cuc','E','Cus','RootA'],
                ['Toe','Cic','Omega0','Cis'],
                ['I0','Crc','Omega','OmegaDot'],
                ['iDot','L2Code','Week','L2Flag'],
                ['SvAccur','SvHealth','Tgd','Iodc'],
                ['Tom','FitInt']];
  for (var i = 1; i < lines.length; ++i) {
    for (var j = 0; j < 4; ++j) {
      var fn = fields[i][j];
      if (fn && lines[i][j])
        eph[fn] = parseNumber(lines[i][j]);
    }
  }
  return eph;
}

function parseData(lines) {
  var data = {};
  while (lines.length >= 8) {
    var eph = parseRecord(lines.splice(0, 8));
    var Prn = eph.Prn;
    var Toc = eph.Toc;
    if (data[Prn] && data[Prn].Toc > Toc)
      continue;
    data[Prn] = eph;
  }
  return data;
}

function parseHeader(lines) {
  while (lines.length > 0) {
    var line = lines[0];
    var values = line.substr(0, 60).replace(/ +(?= )/g,'').trim().split(' ');
    lines.shift();
    switch (line.substr(60).trim()) {
    case 'RINEX VERSION / TYPE':
      if (values[0] != '2.10' && values[0] != '2') {
        console.log('RINEX file format version ' + value[0] + ' not support');
      }
      break;
    case 'END OF HEADER':
      return parseData(lines);
    }
  }
}

function parseRinex(data) {
  var lines = data.replace(/\r/g,'').split('\n');
  return parseHeader(lines);
}

/*
fs = require('fs');
fs.readFile('./rinex.txt', 'utf8', function(err, data) {
  if (err) {
    console.log(err);
    return;
  };
  console.log(JSON.stringify(parseRinex(data)));
});
*/

String.prototype.replaceAll = function(needle, other) {
  var pre = this;
  while (true) {
    var post = pre.replace(needle, other);
    if (pre === post)
      return post;
    pre = post;
  }
}

var Url = require('url');
var Client = require('ftp');
var ChildProcess = require('child_process');

function dayOfYear(t) {
  var start = new Date(t.getUTCFullYear(), 0, 0);
  var diff = t - start;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return Math.floor(day);
}

function fetchRinex(template) {
  // parse the url template
  var t = new Date();
  var url = template
    .replaceAll('${yy}', t.getUTCFullYear() % 100)
    .replaceAll('${yyyy}', t.getUTCFullYear())
    .replaceAll('${ddd}', ('000' + dayOfYear(t)).substr(-3));
  url = Url.parse(url);
  // download the RINEX file
  var c = new Client();
  c.on('ready', function() {
    c.get(url.path, function(err, stream) {
      if (err)
        throw err;
      var filter = ChildProcess.spawn('uncompress');
      stream.pipe(filter.stdin);
      stream.on('end', function() {
        c.end();
      });
      filter.stdout.setEncoding('utf-8');
      var data = '';
      filter.stdout.on('data', function (chunk) {
        data += chunk;
      });
      filter.stdout.on('end', function () {
        console.log(JSON.stringify(parseRinex(data)));
      });
    });
  });
  c.connect({
    host: url.hostname,
    port: url.port | 21,
  });
}

fetchRinex('ftp://cddis.gsfc.nasa.gov/gnss/data/hourly/${yyyy}/${ddd}/hour${ddd}0.15n.Z');
