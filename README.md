# agps.js

Assisted GPS server

HTTP server that fetches the lastest available GPS ephemeris data from NASA / CDDIS and makes
it available in JSON.

The data is fetched from NASA on every request. Make sure you run a cache in front of this
server to avoid melting it.

```
node agps.js
```
