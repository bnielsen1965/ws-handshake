const EventEmitter = require('events');
const WebSocket = require('ws');

const Defaults = {};

class WebSocketServer extends EventEmitter {
  constructor (Config) {
    super();
    this.Config = Object.assign({}, Defaults, Config);
    this.connections = {};
  }

  createServer (httpServer) {
    this.emit('debug', 'Create server.');
    this.wss = new WebSocket.Server({ noServer: true });
    this.wss
      .on('connection', this.onConnection.bind(this))
      .on('close', this.onClose.bind(this));
    httpServer.on('upgrade', this.onUpgrade.bind(this));
    return this;
  }

  destroy () {
    return new Promise((resolve, reject) => {
      if (this.wss) this.wss.close(() => resolve());
      else resolve();
    });
  }

  onClose () {
    this.emit('close');
  }

  onConnection (ws, req) {
    let address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    this.emit('debug', `Connection request from ${address}.`);
    let _this = this;
    _this.connections[address] = { ws, address };
    ws
      .on('message', message => {
        this.emit('message', { address, message });
      })
      .on('close', () => {
        this.emit('close', { address });
        delete _this.connections[address];
      })
      .on('error', error => {
        this.emit('error', `Websocket error on ${address}, ${error}.`);
      })
    _this.emit('open', { address });
  }

  async onUpgrade (req, sock, head) {
    let address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    this.emit('debug', `Socket upgrade for ${address}.`);
    let _this = this;
    try {
      _this.wss.handleUpgrade(req, sock, head, ws => {
        _this.wss.emit('connection', ws, req);
        _this.emit('connection', ws);
        _this.sendMessage(address, { action: 'ping' });
      })
    }
    catch (error) {
      _this.emit('error', error);
    }
  }

  sendMessage (address, message) {
    if (!this.connections[address]) {
      this.emit('error', `Send failed, no connection for ${address}.`);
      return;
    }
    this.emit('debug', `Send message to ${address}.`);
    this.connections[address].ws.send(JSON.stringify(Object.assign({}, message)));
  }

  closeConnection (address) {
    if (!this.connections[address]) {
      this.emit('error', `Close failed, no connection for ${address}.`);
      return;
    }
    this.emit('debug', `Closing connection to ${address}.`);
    this.connections[address].ws.close();
  }
}


const HTTP = require('http');
let httpServer = HTTP.createServer((req, res) => {
  res.write('Hello world!');
  res.end();
});

let wsServer = new WebSocketServer();
wsServer
  .on('debug', (msg) => console.log(`DEBUG: ${msg}`))
  .on('error', (msg) => console.log(`ERROR: ${msg}`))
  .on('connection', (ws) => console.log(`Connection established.`))
  .on('open', (data) => console.log(`Connection open to ${data.address}.`))
  .on('close', (data) => {
    // close event has uuid for client, no data for server close
    if (data && data.address) console.log(`Client connection closed to ${data.address}.`);
    else console.log('Server closed.');
  })
  .on('message',(data) => {
    console.log(`Received from ${data.address}, ${JSON.stringify(data.message)}`);
    // reply back to the same connection uuid with a pong message
    wsServer.sendMessage(data.address, { action: 'pong' });
  })
  .createServer(httpServer);

httpServer.listen(8080, () => {
  console.log(`Server listening on port 8080.`);
});
