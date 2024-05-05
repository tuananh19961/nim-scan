const { default: axios } = require('axios');
const bip39 = require('bip39');
const fs = require('fs');
const cluster = require('cluster');
const send = require('./message');
const NimiqWallet = require('nimiqscan-wallet').default;
const { NimiqWrapper } = require('nimiq-wrapper');

let wrapper = new NimiqWrapper();
wrapper.initNode({
    network: "MAIN",
    whenReady: () => {
        console.log('Nimiq Ready!!!');

        const generateAddress = () => {
            const mnemonic = bip39.generateMnemonic(256)
            const wallet = NimiqWallet.fromMnemonic(mnemonic);
            const address = wallet.getAddress();
            return { address, seed: mnemonic };
        }

        const getBalance = async (address) => new Promise((resolve) => {
            try {
                wrapper.accountHelper.getBalance(address, (b) => {
                    const balance = b / 100000;
                    resolve(balance)
                })
            } catch (error) {
                console.log(error);
                resolve(-1)
            }
        })

        let founds = 0;
        let counts = 0;
        const numCPUs = 16;

        async function generate() {
            const wallet = generateAddress();

            const balance = await getBalance(wallet.address);

            process.send({ ...wallet, balance: `${balance} NIM` });

            if (balance > 0) {
                console.log("");
                process.stdout.write('\x07');
                console.log("\x1b[32m%s\x1b[0m", ">> Success: " + wallet.address);

                var successString = "Wallet: [" + wallet.address + "] - Seed: [" + wallet.seed + "] - Balance: " + balance + " NIM";

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
                    console.clear();
                    console.log(`[${counts} / ${founds}] ${message.address}: ${message.balance}`);
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
            setInterval(generate, 50); // Call the generate function repeatedly with no delay
        }
    }
});
