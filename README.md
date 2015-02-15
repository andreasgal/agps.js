# agps.js

Assisted GPS server

HTTP server that fetches the lastest available GPS ephemeris data from NASA / CDDIS and makes
it available in JSON.

The data is fetched from NASA every 5 minutes. Make sure you run a cache in front of this
server to avoid melting it (cache expiration is set to 5 minutes as well).

```
npm install
node agps.js
```

A compact gzipped JSON format is returned if the accept header is set to "application/json",
otherwise a human readable HTML format is sent back.
