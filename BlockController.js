const MempoolClass = require('./Mempool.js')
const BlockChainClass = require('./BlockChain.js');
const BlockClass = require('./Block.js');
const Boom = require('boom');
const hex2ascii = require('hex2ascii');
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
        this.mempool = new MempoolClass.Mempool();
        this.blockchain = new BlockChainClass.Blockchain();
        this.getBlockByIndex();
        this.getBlockByQuery();
        this.postNewBlock();
        this.postRequestValidation();
        this.postMessageSignatureValidate();
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
                    return this.appendStoryDeccoded(block);
                } catch (e) {
                    throw Boom.badRequest("Block height out of bounds.");
                }
            }
        });
    }

    /**
     * Implement a GET Endpoint to retrieve a block by index, url: "stars/hash:[HASH]", "address:[ADDRESS]"
     */
    getBlockByQuery() {
        this.server.route({
            method: 'GET',
            path: '/stars/{query}',
            handler: async (request, h) => {
                try {
                    let query = request.params.query.split(":");
                    let method = query[0].toLowerCase();
                    let parameter = query[1];

                    // set filter method for "hash" oder "address" request
                    let filter = null;
                    switch(method) {
                        case "hash":
                            filter = function (data) {
                                let block = JSON.parse(data.value);
                                return block.hash === parameter;
                            };
                            break;
                        case "address":
                            filter = function (data) {
                                let body = JSON.parse(data.value).body;
                                try {
                                    return body.address === parameter;
                                } catch (e) {
                                    return false;
                                }
                            };
                            break;
                        default:
                            throw Boom.badRequest("Unknown lookup method.");
                    }

                    // get filtered blocks from blockchain
                    let result = await this.blockchain.getBlockData(filter);

                    if(result.length === 1) {
                        // return single block
                        return this.appendStoryDeccoded(JSON.parse(result[0].value));
                    } else {

                        // return block array
                        let resultArray = [];
                        let self = this;
                        result.forEach(function(element) {
                            resultArray.push(self.appendStoryDeccoded(JSON.parse(element.value)));
                        });
                        return resultArray;
                    }

                } catch (e) {
                    if(e instanceof Boom) {
                        throw e;
                    }
                    throw Boom.badRequest("Unexpected lookup method or error.");
                }
            }
        });
    }

    /**
     * add decoded story to block object
     * @param block
     * @returns {*}
     */
    appendStoryDeccoded(block) {
        let story = block.body.star.story;
        block.body.star.storyDecoded = hex2ascii(story);
        return block;
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
                    // get data from payload JSON
                    let payloadObject = JSON.parse(payload);

                    let walletAddress = payloadObject.address;

                    if(Array.isArray(payloadObject.star)) {
                        throw Boom.badRequest('Only one star per request allowed.');
                    }

                    let starDEC = payloadObject.star.dec;
                    let starRA = payloadObject.star.ra;
                    let starMAG = payloadObject.star.mag;
                    let starCEN = payloadObject.star.cen;
                    let starStory = payloadObject.star.story;

                    if(walletAddress === undefined || walletAddress === null) {
                        throw Boom.badRequest('Unexpected walletAddress or undefined.');
                    }

                    // check if address is in valid mempool
                    this.mempool.verifyAddressRequest(walletAddress);

                    // encode Body
                    let body = {
                        address: walletAddress,
                        star: {
                            ra: starRA,
                            dec: starDEC,
                            mag: starMAG,
                            cen: starCEN,
                            story: Buffer(starStory).toString('hex')
                        }
                    };

                    // create block
                    let block = new BlockClass.Block(body);
                    try {
                        // add block to blockchain
                        let resultBlock = await this.blockchain.addBlock(block);

                        // remove request if block added to blockchain
                        this.mempool.removeValidationRequest(walletAddress);

                        // return JSON for new block
                        return resultBlock;
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

    /**
     * Implement a POST Endpoint to add a new Block, url: "/requestValidation"
     */
    postRequestValidation() {
        this.server.route({
            method: 'POST',
            path: '/requestValidation',
            handler: async (request, h) => {
                let payload = request.payload;

                // check of payload is available
                if(payload === null) {
                    throw Boom.badRequest('Payload must not be empty.');
                }

                try {
                    // get walletAddress from payload JSON
                    let walletAddress = JSON.parse(payload).address;

                    // if walletAddress undefined or null throw exception
                    if(walletAddress === undefined || walletAddress === null) {
                        throw Boom.badRequest('Unexpected address or undefined.');
                    }

                    return this.mempool.addRequestValidation(walletAddress);

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

    /**
     * Implement a POST Endpoint to add a new Block, url: "/message-signature/validate"
     */
    postMessageSignatureValidate() {
        this.server.route({
            method: 'POST',
            path: '/message-signature/validate',
            handler: async (request, h) => {
                let payload = request.payload;

                // check of payload is available
                if(payload === null) {
                    throw Boom.badRequest('Payload must not be empty.');
                }

                try {
                    // get walletAddress from payload JSON
                    let walletAddress = JSON.parse(payload).address;
                    let signature = JSON.parse(payload).signature;

                    // if walletAddress undefined or null throw exception
                    if(walletAddress === undefined || walletAddress === null) {
                        throw Boom.badRequest('Unexpected address or undefined.');
                    }

                    // if signature undefined or null throw exception
                    if(signature === undefined || signature === null) {
                        throw Boom.badRequest('Unexpected signature or undefined.');
                    }

                    return this.mempool.validateRequestByWallet(walletAddress, signature);

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