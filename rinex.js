/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var time = require('time');

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
    Toc: new time.Date(Date.UTC((h[1]|0) + 2000, (h[2]|0)-1, h[3]|0, h[4]|0, h[5]|0, h[6]-0), "UTC"),
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

module.exports = {
  parseRinex: parseRinex,
};
