/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var fetch = require('./fetch.js');
var rinex = require('./rinex.js');
var express = require('express');

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

var app = express();

app.get('/', function (req, res) {
  fetchAndParse(source, function (err, data) {
    if (err) {
      res.status(500).send("Internal error");
      return;
    }
    res.format({
      'application/json': function() {
        res.send(data);
      },
      'text/html': function() {
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
        res.send(html);
      }
    });
  });
});

app.listen(8080);
