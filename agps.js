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
      var oldest = null;
      for (var n = 1; n <= 32; ++n) {
        var nav = state.data[n];
        if (!nav)
          continue;
        if (!oldest || nav.Toc < oldest)
          oldest = nav.Toc;
        navs.push(nav);
      }
      res.locals.navs = navs;
      res.locals.timestamp = new Date(state.timestamp);
      res.locals.oldest = oldest;
      res.render("index.ejs");
    }
  });
});

app.listen(8080);
