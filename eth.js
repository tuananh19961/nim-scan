const bip39 = require('bip39');
const { HDNodeWallet, Mnemonic } = require('ethers');
const Web3 = require('web3').default;
const fs = require('fs');
const cluster = require('cluster');
const send = require('./message');

const ethServers = [
    'wss://lb.drpc.org/ogws?network=ethereum&dkey=An-vczqZVkYyh0hr0vpV9Y5mrvDRCCcR75jkQktuFoNr',
    'wss://lb.drpc.org/ogws?network=ethereum&dkey=AlrxsErafE3_pmQyuSE6Qar8ysDOCGcR75j2QktuFoNr',
    'wss://eth.drpc.org'
]

function random(array) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}

const nodes = [
    new Web3(new Web3.providers.WebsocketProvider(random(ethServers))),
    new Web3(new Web3.providers.WebsocketProvider(random(ethServers))),
    new Web3(new Web3.providers.WebsocketProvider(random(ethServers)))
]

const generateAddress = () => {
    const mnemonic = bip39.generateMnemonic(256)
    const ethMnemonicInstance = Mnemonic.fromPhrase(mnemonic);
    const ethwallet = HDNodeWallet.fromMnemonic(ethMnemonicInstance, `m/44'/60'/0'/0/0`);
    return { address: ethwallet.address, seed: mnemonic };
}

const getBalance = async (address) => new Promise(async (resolve) => {
    try {
        const node = random(nodes);
        const balance = await node.eth.getBalance(address);
        const blc = Number(node.utils.fromWei(balance, 'ether'));
        resolve(blc);
    } catch (error) {
        console.log(error);
        resolve(-1)
    }
})

let founds = 0
let counts = 0;
const numCPUs = 16;

async function generate() {
    const wallet = generateAddress();

    const balance = await getBalance(wallet.address);

    process.send({ ...wallet, balance: `${balance} ETH` });

    if (balance > 0) {
        console.log("");
        process.stdout.write('\x07');
        console.log("\x1b[32m%s\x1b[0m", ">> Success: " + wallet.address);

        var successString = "Wallet: [" + wallet.address + "] - Seed: [" + wallet.seed + "] - Balance: " + balance + " ETH";

        // save the wallet and its private key (seed) to a Success.txt file in the same folder 
        fs.writeFileSync('./match.txt', successString, (err) => {
            if (err) throw err;
        })

        send(successString, 'A Wallet Found Success!!!');
    }
}

if (cluster.isMaster) {
    cluster.on('message', (worker, message) => {
        counts++;
        if (message.address) {
            if (message.balance > 0) {
                founds++;
            }
            console.log(`[${counts} | ${founds}] ${message.address}: ${message.balance} ETH`);
        }
    });

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork(); // Create a new worker process
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`); // Log when a worker process exits
    });
} else {
    setInterval(generate); // Call the generate function repeatedly with no delay
}
