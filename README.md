# WebSocket handshake example

This example code demonstrates how a raw TCP/IP connection to an HTTP web server
is upgraded into a WebSocket connection via an upgrade request.

In most cases this will be handled by a library so this is only to explain what is
happening in the library.


## wsserver.js

The wsserver.js script is an HTTP / websocket server that is used as the target host
for the connection and upgrade example. It creates a web server that listens on port
8080 and has a simple "Hello world!" response if you open a web browser and open the
URL http://localhost:8080.

Start the server:
> node wsserver.js


## client.js

The client.js script will create a raw TCP/IP socket connection to the host server
and then send a request to upgrade the connection to a websocket.

Start client:
> node client.js
