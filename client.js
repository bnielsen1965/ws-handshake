
// settings for the test server
const HostUrl = 'http://localhost:8080';


// Url library will be used to parse the URL into its parts
const Url = require('url');

// tls and net libraries are used to create a socket
const TLS = require('tls');
const Net = require('net');

// GUID is a constant from the WebSocket RFC6455 https://tools.ietf.org/html/rfc6455
// used to generate a digest that verifies the server response is a valid WebSocket upgrade
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// use crypto methods to generate a random Sec-WebSocket-Key for request
// and for hash validation of server Sec-WebSocket-Accept response header
const { randomBytes, createHash } = require('crypto');




// create a raw socket connection to the web server
// we can't use this yet because it is not yet a websocket
let socket = getSocket(HostUrl);

// listening in case the server closes the connection, may need other listeners to monitor socket condition
socket.on('end', () => {
  console.log('Connection closed');
});

// asynchronously perform an upgrade on the socket that is connected to the web server
upgradeSocket(socket, HostUrl)
  .then(() => {
    // at this point the websocket is ready and we can listen for socket messages and send messages
    socket.on('data', data => {
      console.log('DATA:', data.toString());
    })
    console.log('WebSocket upgrade completed.');

    // at this point the WebSocket framing can begin for messaging

    setTimeout(() => {
      console.log('Destroy socket...');
      socket.destroy();
    }, 5000);
  })

  .catch(error => {
    console.log(error.message);
  });




// perform handshake to upgrade socket connection on http server to a websocket
function upgradeSocket (socket, url) {
  return new Promise((resolve, reject) => {
    let key = genKey();
    // listen for initial response from server
    socket.once('data', data => {
      console.log(`Received upgrade response:\r\n${data.toString()}`);
      validateDigest(key, data.toString());
      resolve();
    });

    // send handshake
    let upgradeRequest = assembleHandshake(url, key);
    console.log(`Send upgrade request:\r\n${upgradeRequest}`)
    socket.write(upgradeRequest);
  });
}

// validate server accept matches key
function validateDigest (key, response) {
  let accept = getWSAccept(response);
  let digest = createHash('sha1').update(`${key}${GUID}`).digest('base64');
  if (!digest === accept) throw new Error('Server Sec-WebSocket-Accept digest does not match key.');
}

// get Sec-WebSocket-Accept field from response
function getWSAccept (response) {
  let secWSAccept = new RegExp('^Sec-WebSocket-Accept: (.+)$', 'gmi');
  let match = secWSAccept.exec(response);
  if (match) return match[1];
  throw new Error('Server response does not have Sec-WebSocket-Accept header.');
}

// assemble a websocket upgrade handshake message
function assembleHandshake (url, key) {
//function assembleHandshake (host, origin, key) {
  let urlParts = Url.parse(url);
  return `GET / HTTP/1.1
Host: ${urlParts.hostname}
Upgrade: websocket
Connection: Upgrade
Origin: ${url}
Sec-WebSocket-Key: ${key}
Sec-WebSocket-Version: 13

`;
}

// generate a key for websocket upgrade handshake
function genKey () {
  return randomBytes(16).toString('base64');
}

// get raw socket
function getSocket (url) {
  // create the appropriate socket based on the web server protocol
  let urlParts = Url.parse(url);
  return urlParts.protocol === 'https:' ?
    TLS.connect(urlParts.port, urlParts.hostname, { rejectUnauthorized: false }) :
    Net.connect(urlParts.port, urlParts.hostname, { rejectUnauthorized: false });
}
