/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

    constructor() {
        this.bd = new LevelSandbox.LevelSandbox();
        this.generateGenesisBlock();
    }

    // Auxiliar method to create a Genesis Block (always with height= 0)
    // You have to options, because the method will always execute when you create your blockchain
    // you will need to set this up statically or instead you can verify if the height !== 0 then you
    // will not create the genesis block
    generateGenesisBlock(){
        // Add your code here
        let self = this;
        self.bd.getBlocksCount().then((height) => {
           if(height === 0) {
               this.addBlock(new Block.Block("First block in the chain - Genesis block")).then((block) => {
                   console.log("added Genesis block");
                   console.log(block);
               })
           }
        });
    }

    // Get block height, it is auxiliar method that return the height of the blockchain
    async getBlockHeight() {
        // Add your code here
        return this.bd.getBlocksCount();
    }

    // Add new block
    async addBlock(block) {
        // Add your code here
        let height = await this.getBlockHeight();

        // Block height
        block.height = height;

        if(height > 0) {
            let previousBlock = await this.getBlock(height - 1);

            // previous block hash
            block.previousBlockHash = previousBlock.hash;
        }

        // UTC timestamp
        block.time = new Date().getTime().toString().slice(0,-3);

        // Block hash with SHA256 using newBlock and converting to a string
        block.hash = SHA256(JSON.stringify(block)).toString();

        let self = this;
        return new Promise(function(resolve, reject) {
            // Adding block object to chain
            self.bd.addLevelDBData(block.height, JSON.stringify(block)).then(()  => {
                resolve(block);
            }).catch((e) => {
                reject(e);
            });
        });
    }

    // Get Block By Height
    async getBlock(height) {
        // Add your code here
        let self = this;
        return new Promise(function (resolve, reject) {
            self.bd.getLevelDBData(height).then((block) => {
                resolve(JSON.parse(block));
            }).catch((e) => {
                reject(e);
            });
        });
    }

    // Validate if Block is being tampered by Block Height
    validateBlock(height) {
        // Add your code here
        let self = this;
        return new Promise(function (resolve, reject) {
            // get block object
            self.getBlock(height).then((block) => {
                // get block hash
                let blockHash = block.hash;

                // remove block hash to test block integrity
                block.hash = '';

                // generate block hash
                let validBlockHash = SHA256(JSON.stringify(block)).toString();

                // Compare
                if (blockHash===validBlockHash) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    // Validate Blockchain
    async validateChain() {
        // Add your code here
        let self = this;
        let errorLog = [];

        let height = await self.getBlockHeight();
        for(var idx = 0; idx < height - 1; idx++) {
            let block = await self.getBlock(idx);
            let previousBlock = await self.getBlock(idx+1);

            if(await self.validateBlock(idx)) {
                let blockHash = block.hash;
                let previousBlockHash = previousBlock.previousBlockHash;

                if (blockHash!==previousBlockHash) {
                    errorLog.push(idx);
                }
            } else {
                errorLog.push(idx);
            }
        }

        return new Promise(function(resolve, reject){
            resolve(errorLog);
        });
    }

    // Utility Method to Tamper a Block for Test Validation
    // This method is for testing purpose
    _modifyBlock(height, block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
                resolve(blockModified);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }
   
}

module.exports.Blockchain = Blockchain;