/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Url = require('url');
var Ftp = require('ftp');
var streamToBuffer = require('stream-to-buffer');
var uncompress = require('uncompress');

function replaceAll(haystack, needle, other) {
  var pre = haystack;
  while (true) {
    var post = pre.replace(needle, other);
    if (pre === post)
      return post;
    pre = post;
  }
}

function dayOfYear(t) {
  var start = new Date(t.getUTCFullYear(), 0, 0);
  var diff = t - start + t.getTimezoneOffset() * 60 * 1000;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return Math.floor(day);
}

function fetch(template, callback) {
  // parse the url template
  var t = new Date();
  var url = template;
  url = replaceAll(url, '${yy}', t.getUTCFullYear() % 100);
  url = replaceAll(url, '${yyyy}', t.getUTCFullYear());
  url = replaceAll(url, '${ddd}', ('000' + dayOfYear(t)).substr(-3));
  url = Url.parse(url);
  var c = new Ftp();
  c.on('ready', function() {
    c.get(url.path, function(err, stream) {
      if (err) {
        callback(err);
        return;
      }
      streamToBuffer(stream, function (err, buffer) {
        if (err) {
          callback(err);
          return;
        }
        c.end();
        callback(false, uncompress(buffer));
      });
    });
  });
  c.connect({
    host: url.hostname,
    port: url.port | 21,
  });
}

module.exports = fetch;
