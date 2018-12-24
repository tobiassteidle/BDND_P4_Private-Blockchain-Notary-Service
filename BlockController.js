const BlockChainClass = require('./BlockChain.js');
const BlockClass = require('./Block.js');
const Boom = require('boom');
/**
 * Controller Definition to make routes work with blocks
 */
class BlockController {

    /**
     * Constructor to create a new BlockController.
     * @param {*} server
     */
    constructor(server) {
        this.server = server;
        this.blockchain = new BlockChainClass.Blockchain(); // initialize Blockchain
        this.getBlockByIndex();
        this.postNewBlock();
    }

    /**
     * Implement a GET Endpoint to retrieve a block by index, url: "/block/:index"
     */
    getBlockByIndex() {
        this.server.route({
            method: 'GET',
            path: '/block/{index}',
            handler: async (request, h) => {
                // get parameter from url
                let height = encodeURIComponent(request.params.index);
                try {
                    // convert "height" paramter to integer
                    height = parseInt(height);

                    // check for valid height
                    if(Number.isNaN(height)) {
                        throw Boom.badRequest();
                    }
                } catch (e) {
                    throw Boom.badRequest("Block height must be a valid integer.");
                }

                try {
                    // receive block from blockchain
                    let block = await this.blockchain.getBlock(height);
                    return JSON.stringify(block);
                } catch (e) {
                    throw Boom.badRequest("Block height out of bounds.");
                }
            }
        });
    }

    /**
     * Implement a POST Endpoint to add a new Block, url: "/block"
     */
    postNewBlock() {
        this.server.route({
            method: 'POST',
            path: '/block',
            handler: async(request, h) => {
                let payload = request.payload;

                // check of payload is available
                if(payload === null) {
                    throw Boom.badRequest('Payload must not be empty. No block created.');
                }

                try {
                    // get body from payload JSON
                    let body = JSON.parse(payload).body;

                    // if body undefined or null throw exception
                    if(body === undefined || body === null) {
                        throw Boom.badRequest('Unexpected Body or undefined.');
                    }

                    // create block
                    let block = new BlockClass.Block(JSON.parse(payload).body);
                    try {
                        // add block to blockchain
                        let resultBlock = await this.blockchain.addBlock(block);

                        // return JSON for new block
                        return JSON.stringify(resultBlock);
                    } catch (e) {
                        throw Boom.internal("Unexpected error when adding block to blockchain.");
                    }
                } catch (e) {
                    // throw "bad request" exception
                    if(e instanceof Boom) {
                        throw e;
                    }
                    throw Boom.badRequest('Unexpected Payload or invalid JSON.');
                }
            }
        });
    }
}

/**
 * Exporting the BlockController class
 * @param {*} server
 */
module.exports = (server) => { return new BlockController(server);}