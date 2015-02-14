/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var fetch = require('./fetch.js');
var rinex = require('./rinex.js');
var http = require('http');

var source = 'ftp://cddis.gsfc.nasa.gov/gnss/data/hourly/${yyyy}/${ddd}/hour${ddd}0.15n.Z';

function fetchAndParse(source, callback) {
  fetch(source, function (err, data) {
    if (err) {
      callback(err);
      return;
    }
    callback(false, rinex.parseRinex(data));
  });
}

var server = http.createServer(function (request, response) {
  fetchAndParse(source, function (err, data) {
    if (err) {
      response.writeHead(501);
      response.end("Not implemented.");
    } else {
      if (request.url === '/json') {
        response.writeHead(200, {"Content-Type": "text/json"});
        response.end(JSON.stringify(data));
      } else {
        response.writeHead(200, {"Content-Type": "text/html"});
        var html = "<html>";
        html += "<head><title>AGPS status</title></head>";
        html += "<body>";
        for (var n = 1; n <= 32; ++n) {
          html += "<table>";
          var eph = data[n];
          Object.keys(eph).forEach(function (key) {
            html += "<tr><td><b>" + key + "</b>: </td><td>" + eph[key] + "</td></td>";
          });
          html += "</table>";
        }
        html += "</body>";
        html += "</html>";
        response.end(html);
      }
    }
  });
});

server.listen(8080);
