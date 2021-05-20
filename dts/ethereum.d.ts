declare module Plugins.Ethereum{
    interface IEth{
        getBalanceOf(address: string): Promise<string>;
    }
    interface ITokenInfo{
        decimals: number;
        name: string;
        symbol: string;
    }
    interface IBlock{
        author: string;
        difficulty: string;
        extraData: string;
        gasLimit: number;
        gasUsed: number;        
        hash: string;
        logsBloom: string;
        miner: string;
        number: number;
        parentHash: string;
        receiptsRoot: string;
        sealFields: string[];
        sha3Uncles: string;
        signature: string;
        size: number;
        timestamp: number;
        totalDifficulty: string;
        transactions: string[];
        transactionsRoot: string;
        uncles: string[];
    }
    interface IToken {
        getBalanceOf(address: string): Promise<string>;
        getInfo(): Promise<ITokenInfo>;
        getDecimals(): Promise<number>;
        getName(): Promise<string>;
        getSymbol(): Promise<string>;
    }
	interface INetwork{
        call(abi: any, contractAddress: string, methodName: string, args?: any, options?: any): Promise<any>;
        eth: IEth;
        token(tokenAddress: string): IToken;
        getBlock(blockHashOrBlockNumber: number|string, returnTransactionObjects: boolean): Promise<IBlock>;
        getBlockNumber(): Promise<number>;
        getPastEvents(abi: any, contractAddress: string | string[], fromBlock: number, toBlock: number|string, events?: string[]): Promise<any>;
        getTransaction(transactionHash: string): Promise<any>;
	}
	function network(networkName?: string): INetwork;
    function getAbiEvents(abi: any): any;
}