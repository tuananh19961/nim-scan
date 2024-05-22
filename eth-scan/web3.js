const uuid = require('uuid');
const uuidv4 = uuid.v4;
const WebSocket = require('ws');

class InternalWeb3 {
  endpoint = ''
  socket = null;
  started = false;
  coin = ''

  constructor(endpoint, coin) {
    this.endpoint = endpoint;
    this.coin = coin;
    this.socket = new WebSocket(`${endpoint}/proxy`);

    this.socket.addEventListener('open', () => {
      this.started = true;
      this.socket.send(JSON.stringify({method: 'wallet_init', id: uuidv4(), params: {} }));
    });

    this.socket.addEventListener('error', (error) => {
      console.log(error);
      // this.started = true;
      // this.socket.send(JSON.stringify({method: 'wallet_init', id: uuidv4(), params: {} }));
    });
  }

  close() {
    this.socket.close();
  }

  async includes(address) {
    const id = uuidv4();
    this.socket.send(JSON.stringify({method: 'wallet_includeRich', id: id, params: { address: address, coin: this.coin } }));

    return new Promise((resolve) => {
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          this.socket.removeEventListener('message', handler);
          resolve(data.status);
        }
      }
      this.socket.addEventListener('message', handler);
    })
  }
}

module.exports = InternalWeb3;