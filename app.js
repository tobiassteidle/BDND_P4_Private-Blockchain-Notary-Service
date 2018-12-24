const Hapi = require('hapi');

/**
 * Class Definition for the REST API
 */
class BlockAPI {

    constructor() {
        this.server = Hapi.Server({
            port: 8000,
            host: 'localhost'
        });
        this.initControllers();
        this.start();
    }

    initControllers() {
        require("./BlockController.js")(this.server);
    }

    async start() {
        await this.server.start();
        console.log(`Server running at: ${this.server.info.uri}`);
    }
}

new BlockAPI();