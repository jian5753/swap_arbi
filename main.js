const arbiMonitor = require("./arbiMonitor");
const utils = require("./utils");

var test = new arbiMonitor.ArbiMonitor(
    _platform1Factory = utils.PANCAKE_FACTORY_ADDRESS,
    _platform2Factory = utils.BAKERY_FACTORY_ADDRESS,
    _platform1Router = utils.PANCAKE_ROUTER_ADDRESS,
    _platform2Router = utils.BAKERY_ROUTER_ADDRESS,
    _token1 = utils.WBNB_ADDRESS,
    _token2 = utils.ETH_ADDRESS
);

test.allowTrade = false;
test.checkAndTrade();