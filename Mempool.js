const MempoolResponseObjectClass = require('./MempoolResponseObject.js');
const ValidationResponseObjectClass = require('./ValidationResponseObject.js');
const Boom = require('boom');
const bitcoinMessage = require('bitcoinjs-message');
const TimeoutRequestsWindowTime = 5*60*1000;
//const TimeoutRequestsWindowTime = 5*1000;

class Mempool {

    constructor() {
        this.mempool = [];
        this.mempoolValid = [];
        this.timeoutRequests = [];
    }

    /**
     * Stores validation requests temporary
     * @param walletAddress
     */
    addRequestValidation(walletAddress) {
        let request = this.mempool[walletAddress];
        if(request === undefined) {
            let requestObject = new MempoolResponseObjectClass.MempoolResponseObject(walletAddress, TimeoutRequestsWindowTime / 1000);
            this.mempool[walletAddress] = requestObject;

            let self = this;
            self.timeoutRequests[walletAddress] = setTimeout(function() {
                self.removeValidationRequest(walletAddress);
            }, TimeoutRequestsWindowTime );

            return requestObject;
        } else {
            // update validationWindow
            request.validationWindow = this.calcValidationWindow(request.requestTimeStamp);
            return request;
        }
    }

    /**
     * Removes validation request from mempool
     * @param walletAddress
     */
    removeValidationRequest(walletAddress) {
        delete this.mempool[walletAddress];
        delete this.mempoolValid[walletAddress];
        delete this.timeoutRequests[walletAddress];
    }

    /**
     * Calculates the validation window
     * @param timeStamp
     * @returns {number}
     */
    calcValidationWindow(timeStamp) {
        let timeElapse = (new Date().getTime().toString().slice(0,-3)) - timeStamp;
        let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
        return timeLeft;
    }

    /**
     * Validates signature by wallet address
     * @param walletAddress
     * @param signature
     */
    validateRequestByWallet(walletAddress, signature) {
        let mempoolRequest = this.mempool[walletAddress];

        if(mempoolRequest === undefined) {
            throw Boom.badRequest('Validation request expired or unknown wallet address.');
        }

        let isValid = bitcoinMessage.verify(mempoolRequest.message, walletAddress, signature);

        let validationResponse = new ValidationResponseObjectClass.ValidationResponseObject(mempoolRequest, isValid, this.calcValidationWindow(mempoolRequest.requestTimeStamp));

        if(isValid) {
            this.timeoutRequests[walletAddress];
            this.mempoolValid[walletAddress] = validationResponse;
        }

        return validationResponse;
    }

    /**
     * Verify if the request validation exists and if it is valid.
     * @param walletAddress
     */
    verifyAddressRequest(walletAddress) {
        let validRequest = this.mempoolValid[walletAddress];
        if(validRequest === undefined || !validRequest.status.messageSignature) {
            throw Boom.badRequest('Invalid wallet address.');
        }
    }
}

module.exports.Mempool = Mempool;