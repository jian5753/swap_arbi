const utils = require("./utils");

class ArbiMonitor{
    constructor(_platform1Factory, _platform2Factory, _platform1Router, _platform2Router, _token1, _token2){
        this.platform1Router = _platform1Router
        this.platform2Router = _platform2Router
        this.platform1 = new utils.web3.eth.Contract(
            utils.FACTORY_ABI,
            _platform1Factory
        );
        this.platform2 = new utils.web3.eth.Contract(
            utils.FACTORY_ABI,
            _platform2Factory
        )
        this.token1 = _token1;
        this.token2 = _token2;
        this.initialized = false;
        this.allowTrade = false;
    }
    
    async initialize(){
        this.pairAddressOnPlatform1 = await this.platform1.methods.getPair(
            this.token1, this.token2
        ).call();
        
        this.pairAddressOnPlatform2 = await this.platform2.methods.getPair(
            this.token1, this.token2
        ).call();

        this.pairOnPlatform1 = new utils.web3.eth.Contract(
            utils.PAIR_ABI,
            this.pairAddressOnPlatform1
        );
        this.pairOnPlatform2 = new utils.web3.eth.Contract(
            utils.PAIR_ABI,
            this.pairAddressOnPlatform2
        );
        this.initialized = true;
    }

    async _arbiScout(){
        if (! this.initialized){
            console.log('initialing...')
            await this.initialize();
        }

        let platform1Reserve = await this.pairOnPlatform1.methods.getReserves().call();
        let platform2Reserve = await this.pairOnPlatform2.methods.getReserves().call();

        let t1_p1Rsv = Number(platform1Reserve['0']) / utils.INT_UNIT;
        let t2_p1Rsv = Number(platform1Reserve['1']) / utils.INT_UNIT;
        let t1_p2Rsv = Number(platform2Reserve['0'] / utils.INT_UNIT);
        let t2_p2Rsv = Number(platform2Reserve['1'] / utils.INT_UNIT);

        let k_p1 = t1_p1Rsv * t2_p1Rsv;
        let k_p2 = t1_p2Rsv * t2_p2Rsv;

        let tokenRatio_p1 = t1_p1Rsv / t2_p1Rsv;
        let tokenRatio_p2 = t1_p2Rsv / t2_p2Rsv;    
        
        let firstInRsv, firstOutRsv, secondInRsv, secondOutRsv;
        let firstPlatform, secondPlatform, firstWay, secondWay
        if (k_p1 <= k_p2){
            // k_bkry is larger, use ratio in bkry to determine first in token;
            //pnckFirst = true;
            firstPlatform = this.platform1Router;
            secondPlatform = this.platform2Router;
            if (tokenRatio_p2 > tokenRatio_p1){
                //kltt1FirstIn = true;
                firstWay = [this.token1, this.token2];
                secondWay = [this.token2, this.token1];
                firstInRsv = t1_p1Rsv;
                firstOutRsv = t2_p1Rsv;
                secondInRsv = t2_p2Rsv;
                secondOutRsv = t1_p2Rsv;
            } else {
                //kltt1FirstIn = false;
                firstWay = [this.token2, this.token1];
                secondWay = [this.token1, this.token2];
                firstInRsv = t2_p1Rsv;
                firstOutRsv = t1_p1Rsv;
                secondInRsv = t1_p2Rsv;
                secondOutRsv = t2_p2Rsv;
            }
        } else {
            //pnckFirst = false;
            firstPlatform = this.platform2Router;
            secondPlatform = this.platform1Router;
            // k_pnck is larger use ration in bkry to determine first in token;
            if (tokenRatio_p1 > tokenRatio_p2){
                firstWay = [this.token1, this.token2];
                secondWay = [this.token2, this.token1];
                //kltt1FirstIn = true;
                firstInRsv = t1_p2Rsv;
                firstOutRsv = t2_p2Rsv;
                secondInRsv = t2_p1Rsv;
                secondOutRsv = t1_p1Rsv;
            } else {
                //kltt1FirstIn = false;
                firstWay = [this.token2, this.token1];
                secondWay = [this.token1, this.token2];
                firstInRsv = t2_p2Rsv;
                firstOutRsv = t1_p2Rsv;
                secondInRsv = t1_p1Rsv;
                secondOutRsv = t2_p1Rsv
            }
        }
        let optimizedInput = utils.arbiProfitOptimize(firstInRsv, firstOutRsv, secondInRsv, secondOutRsv);
        let optimizedInputString = (optimizedInput *  utils.INT_UNIT).toString();
       
        let analysisResult = {
            firstPlatform: firstPlatform,
            secondPlatform: secondPlatform,
            firstWay: firstWay,
            secondWay: secondWay,
            optimizedInputString: optimizedInputString
        }
        
        return analysisResult

    }

    async _trade(analysisResult){
        const txData = utils.PARTITION_FULL.methods.tokenAInTokenBOut(
            analysisResult.firstPlatform,
            analysisResult.secondPlatform,
            analysisResult.optimizedInputString,
            analysisResult.firstWay,
            analysisResult.secondWay
        ).encodeABI();
    
        const nonce = await utils.web3.eth.getTransactionCount(utils.ACCOUNT_BINANCE.address);
        console.log(nonce)
        
        const txObject = {
            nonce: utils.web3.utils.toHex(nonce),
            to: utils.PARTITION_FULL_ADDRESS,
            data: txData,
            gas: 400000,
        }
        
        utils.web3.eth.accounts.signTransaction(
            txObject, utils.PRIVATE_KEY_BINANCE 
        ).then(signedTx => {
            console.log(signedTx.transactionHash);
            utils.web3.eth.sendSignedTransaction(
                signedTx.rawTransaction
            ).on('receipt', console.log);
        })
    }

    async show(){
        await this.initialize();
        console.log(this);
    }

    async checkAndTrade(){
        let result = await this._arbiScout()
        console.log(result)
        
        if(this.allowTrade){
            await this._trade(result);
        }else{
            console.log('no trade')
        }
    }
}

module.exports= {
    ArbiMonitor: ArbiMonitor
}
// var test = new ArbiMonitor(
//     utils.PANCAKE_FACTORY_ADDRESS,
//     utils.BAKERY_FACTORY_ADDRESS,
//     utils.PANCAKE_ROUTER_ADDRESS,
//     utils.BAKERY_ROUTER_ADDRESS,
//     utils.KLTT1_ADDRESS,
//     utils.KLTT2_ADDRESS
// );

// test.allowTrade = false;
// test.checkAndTrade();