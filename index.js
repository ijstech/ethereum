const Web3 = require("web3");
const BigNumberLib = require('@ijstech/bignumber')        
const BigNumber = BigNumberLib.BigNumber;
const NullAddress = "0x0000000000000000000000000000000000000000";

var Options = {};
var Networks = {};
var TokenDecimals = {};

function getErrorMessage(error){
    try {
        if (error && error.message && error.message.includes("VM execution error.")) {
            let msg = (error.data || error.message).match(/0x[0-9a-fA-F]*/)[0]
            if (msg.startsWith("0x08c379a")) {
                msg = Web3.eth.abi.decodeParameter('string', "0x"+msg.substring(10));
                let err = new Error(msg);                
                return err;
            }
        }
    } catch (e) {}
    return error;
}
function fromWei(value){
    return Web3.utils.fromWei(value);
}
function fromDecimals(value, decimals){
    return new BigNumber(value).div(10**decimals).toString();
}
function call(networkName, abi, contractAddress, methodName, args, options) {
    return new Promise(async function(resolve, reject){
        options = options || {};
        let network = getNetwork(networkName);        
        if (network){
            try {
                let contract = new network.eth.Contract(abi, contractAddress);
                if (args != undefined && !Array.isArray(args))
                    args = [args];
                let method = contract.methods[methodName].apply(this, args)
                let result = await method.call({from: options.account || NullAddress, value: "0x" + new BigNumber(options.value || 0).toString(16)});
                return resolve(result);
            } catch(e) {                
                return reject(getErrorMessage(e));
            }
        }    
        else
            reject('$unknown_network')
    })
}
function getAbiEvents(abi) {
    let events = abi.filter(e => e.type=="event");    
    let eventMap = {};

    for (let i = 0 ; i < events.length ; i++) {
        let topic = Web3.utils.soliditySha3(events[i].name + "(" + events[i].inputs.map(e=>e.type).join(",") + ")");
        eventMap[topic] = events[i];
    }
    return eventMap;
}
function getNetwork(networkName){    
    try{
        networkName = networkName.toLowerCase();        
        if (!Networks[networkName] && Options.provider){
            let opt = Options.provider[networkName] || Options.provider;
            if (opt.endpoint){
                switch (opt.type){
                    case 'http':
                        Networks[networkName] = new Web3(new Web3.providers.HttpProvider(opt.endpoint));
                        break;
                    case 'websocket':
                        Networks[networkName] = new Web3(new Web3.providers.WebsocketProvider(opt.endpoint));
                        break;
                }
            }
        }
        return Networks[networkName];
    }
    catch(err){

    }
}
function getBlock(networkName, blockHashOrBlockNumber, returnTransactionObjects){
    return new Promise(async function (resolve, reject) {
        let network = getNetwork(networkName);
        if (network){
            try{
                let result = await network.eth.getBlock(blockHashOrBlockNumber, returnTransactionObjects);            
                resolve(result)
            }
            catch(err){
                reject(err)
            }
        }    
        else
            reject('$unknown_network')    
    })
}
function getBlockNumber(networkName){
    return new Promise(async function (resolve, reject) {
        let network = getNetwork(networkName);
        if (network){
            try{
                let result = await network.eth.getBlockNumber();            
                resolve(result)
            }
            catch(err){
                reject(err)
            }
        }    
        else
            reject('$unknown_network')    
    })
}
function getEthBalance(networkName, address){
    return new Promise(async function (resolve, reject) {
        let network = getNetwork(networkName);
        if (network){
            try{
                let result = await network.eth.getBalance(address);                
                resolve(fromWei(result));
            }
            catch(err){
                reject(err)
            }
        }    
        else
            reject('$unknown_network')    
    })
}
async function getTokenBalanceOf(networkName, tokenAddress, accountAddress){    
    let abi = [{
        "constant": true,
        "inputs": [
            {
            "name": "_owner",
            "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
            "name": "balance",
            "type": "uint256"
            }
        ],
        "payable": false,
        "type": "function"
    }];
    let result = await call(networkName, abi, tokenAddress, 'balanceOf', [accountAddress]);
    let decimals = await getTokenDecimals(networkName, tokenAddress);
    if (decimals)
        return fromDecimals(result, decimals);
}
function getTokenName(networkName, tokenAddress){
    let abi = [{
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      }];
    return call(networkName, abi, tokenAddress, 'name');
}
async function getTokenDecimals(networkName, tokenAddress){
    if (TokenDecimals[networkName + '_' + tokenAddress])
        return TokenDecimals[networkName + '_' + tokenAddress];
    let abi = [{
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "name": "",
            "type": "uint8"
          }
        ],
        "payable": false,
        "type": "function"
      }];
    let result;
    try{
        result = await call(networkName, abi, tokenAddress, 'decimals');
        TokenDecimals[networkName + '_' + tokenAddress] = result;
    }
    catch(err){        
    }
    return result;
}
function getTokenSymbol(networkName, tokenAddress){
    let abi = [{
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      }];
    return call(networkName, abi, tokenAddress, 'symbol');
}
async function getTokenInfo(networkName, tokenAddress){
    let result = {
        decimals: await getTokenDecimals(networkName, tokenAddress),
        name: await getTokenName(networkName, tokenAddress),
        symbol: await getTokenSymbol(networkName, tokenAddress)
    }
    return result;
}
function getPastEvents(networkName, abi, contractAddress, fromBlock, toBlock, events){
    return new Promise(async function (resolve, reject) {
        let network = getNetwork(networkName);        
        if (network){       
            if (Array.isArray(abi)){
                abi = getAbiEvents(abi);                
            }

            if (events && !Array.isArray(events))
                events = [events];
            try{
                let logs = await network.eth.getPastLogs({
                    fromBlock: fromBlock,   
                    toBlock: toBlock,
                    address: contractAddress
                })                
                let result = [];
                if (logs) {                    
                    if (!Array.isArray(logs)) {
                        logs = [logs];
                    }
                    for (let i = 0 ; i < logs.length ; i++) {
                        let e = logs[i];
                        let event = abi[e.topics[0]];
                        if (event && (!events || events.includes(event.name))){
                            let log = network.eth.abi.decodeLog(event.inputs, e.data, e.topics.slice(1));
                            log.__name = event.name;
                            log.__address = e.address;
                            log.__blockNumber = e.blockNumber;
                            log.__transactionHash = e.transactionHash;
                            result.push(log);
                        }
                    }
                }
                resolve(result);
            }
            catch(err){
                reject(err)
            }
        }    
        else
            reject('$unknown_network')    
    })
}
function network(networkName){                    
    return {
        call(abi, contractAddress, methodName, args, options){
            return call(networkName, abi, contractAddress, methodName, args, options);
        },
        getBlock(blockHashOrBlockNumber, returnTransactionObjects){
            return getBlock(networkName, blockHashOrBlockNumber, returnTransactionObjects);            
        },
        getBlockNumber(){
            return getBlockNumber(networkName);
        },
        getPastEvents(abi, contractAddress, fromBlock, toBlock, events){
            return getPastEvents(networkName, abi, contractAddress, fromBlock, toBlock, events);
        },
        eth: {
            getBalanceOf: function(address){
                return getEthBalanceOf(networkName, address);
            }
        },
        token: function(tokenAddress) {
            return {                                
                getBalanceOf: function(address){
                    return getTokenBalanceOf(networkName, tokenAddress, address);
                },
                getInfo: async function(){
                    return getTokenInfo(networkName, tokenAddress)
                },
                getDecimals: function(){
                    return getTokenDecimals(networkName, tokenAddress)
                },
                getName: function(){
                    return getTokenName(networkName, tokenAddress)
                },
                getSymbol: function(){
                    return getTokenSymbol(networkName, tokenAddress)
                }                         
            }
        }
    }
};

module.exports = {
    _init: function(options){
        Options = options;
    },
    _plugin: async function(vm, ctx, site, options){                 
        BigNumberLib._plugin(vm);        
        vm.injectGlobalObject('_$$plugin_ethereum', {
            $$call: true,
            call: async function(networkName, abi, contractAddress, methodName, args, options){
                let result = await call(networkName, abi, contractAddress, methodName, args, options);
                return JSON.stringify(result);
            },
            $$getBlock: true,
            getBlock: async function (networkName, blockHashOrBlockNumber, returnTransactionObjects) {                
                let result = await getBlock(networkName || Options.network, blockHashOrBlockNumber, returnTransactionObjects);
                return JSON.stringify(result);
            },
            $$getBlockNumber: true,
            getBlockNumber: async function (networkName) {                
                return getBlockNumber(networkName || Options.network);
            },
            $$getEthBalanceOf: true,
            getEthBalanceOf: async function(networkName, address){
                return getEthBalance(networkName || Options.network, address);
            },
            $$getPastEvents: true,
            getPastEvents: async function(networkName, abi, contractAddress, fromBlock, toBlock, events){
                let result = await getPastEvents(networkName  || Options.network, abi, contractAddress, fromBlock, toBlock, events);                
                return JSON.stringify(result);
            },
            $$getTokenBalanceOf: true,
            getTokenBalanceOf: async function(networkName, tokenAddress, accountAddress){
                return getTokenBalanceOf(networkName || Options.network, tokenAddress, accountAddress);
            },
            $$getTokenDecimals: true,
            getTokenDecimals: function(networkName, tokenAddress){
                return getTokenDecimals(networkName || Options.network, tokenAddress);
            },            
            $$getTokenInfo: true,
            getTokenInfo: async function(networkName, tokenAddress){
                let result = await getTokenInfo(networkName || Options.network, tokenAddress);
                return JSON.stringify(result);
            },
            $$getTokenName: true,
            getTokenName: function(networkName, tokenAddress){
                return getTokenName(networkName || Options.network, tokenAddress)
            },
            $$getTokenSymbol: true,
            getTokenSymbol: function(networkName, tokenAddress){
                return getTokenSymbol(networkName || Options.network, tokenAddress);
            },
            getAbiEvents: function(abi){
                return getAbiEvents(abi);
            }
        }, ''+ function init(){
            global.Plugins.Ethereum = {
                network: function(networkName){                    
                    return {
                        async call(abi, contractAddress, methodName, args, options){
                            let result = await  _$$plugin_ethereum.call(networkName, abi, contractAddress, methodName, args, options);
                            return JSON.parse(result);
                        },
                        async getBlock(blockHashOrBlockNumber, returnTransactionObjects){
                            let result = await  _$$plugin_ethereum.getBlock(networkName, blockHashOrBlockNumber, returnTransactionObjects);
                            return JSON.parse(result);
                        },
                        getBlockNumber(){
                            return _$$plugin_ethereum.getBlockNumber(networkName);
                        },
                        async getPastEvents(abi, contractAddress, fromBlock, toBlock, events){
                            let result = await _$$plugin_ethereum.getPastEvents(networkName, abi, contractAddress, fromBlock, toBlock, events);
                            return JSON.parse(result);
                        },
                        eth: {
                            getBalanceOf: function(address){
                                return _$$plugin_ethereum.getEthBalanceOf(networkName, address);
                            }
                        },
                        token: function(tokenAddress) {
                            return {                                
                                getBalanceOf: function(address){
                                    return _$$plugin_ethereum.getTokenBalanceOf(networkName, tokenAddress, address);
                                },
                                getInfo: async function(){
                                    let result = await _$$plugin_ethereum.getTokenInfo(networkName, tokenAddress)
                                    return JSON.parse(result);
                                },
                                getDecimals: function(){
                                    return _$$plugin_ethereum.getTokenDecimals(networkName, tokenAddress)
                                },
                                getName: function(){
                                    return _$$plugin_ethereum.getTokenName(networkName, tokenAddress)
                                },
                                getSymbol: function(){
                                    return _$$plugin_ethereum.getTokenSymbol(networkName, tokenAddress)
                                }                         
                            }
                        }
                    }
                },
                getAbiEvents: function(abi){
                    return _$$plugin_ethereum.getAbiEvents(abi);
                }
            }
        } + ';init()')
    },
    call: call,
    fromWei: fromWei,    
    getAbiEvents: getAbiEvents,
    getBlock: getBlock,
    getBlockNumber: getBlockNumber,        
    getEthBalance: getEthBalance,
    getPastEvents: getPastEvents,
    getTokenBalanceOf: getTokenBalanceOf,
    getTokenDecimals: getTokenDecimals,
    getTokenInfo: getTokenInfo,
    getTokenName: getTokenName,
    getTokenSymbol: getTokenSymbol,
    network: network
}