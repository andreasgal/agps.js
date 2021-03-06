/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var express = require('express');
var compress = require('compression');

var fetch = require('./fetch.js');
var rinex = require('./rinex.js');

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

// Update our AGPS data every 5 minutes.
var state = {
  data: null,
  timestamp: null,
};
function update() {
  fetchAndParse(source, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      return;
    }
    state.data = data;
    state.timestamp = Date.now();
  });
  setTimeout(update, 5 * 60 * 1000);
}
update();

var app = express();

app.use(compress());

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  if (!state.data) {
    res.status(503).send("Service Unavailable");
    return;
  }
  // We update every 5 minutes and allow 5 minutes of caching. A client should never
  // receive data that is more than 10 minutes old as far as this server is concerned.
  // The source data might be up to an hour old. Ephemeris data is valid for 4 hours
  // so we should be well within the validity period.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.format({
    'application/json': function() {
      res.send(state.data);
    },
    'text/html': function() {
      var navs = [];
      for (var n = 1; n <= 32; ++n)
        navs[n] = state.data[n];
      res.locals.navs = navs;
      res.locals.timestamp = new Date(state.timestamp);
      res.locals.age = function (nav) {
        if (!nav)
          return 0.0;
        var diff = (Date.now() - nav.Toc) / 1000 / 60 / 60;
        diff = Math.max(diff, 0); // if more current than now, its current
        diff = Math.min(diff, 4); // if older than 4 hours, then its out of date (4)
        var color = Math.floor(255 * (diff/4));
        return "background-color:rgb(" + color + ",0,0);background-color:rgb(0," + (255-color) + ",0)";
      }
      res.render("index.ejs");
    }
  });
});

app.listen(process.env.OPENSHIFT_NODEJS_PORT || 8080,
           process.env.OPENSHIFT_NODEJS_IP || 'localhost');
