declare namespace Plugins {
	export namespace Ethereum{
		export interface IBlock{
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
	    export interface IEth{
	        getBalanceOf(address: string): Promise<string>;
	    }
	    export interface ITokenInfo{
	        decimals: number;
	        name: string;
	        symbol: string;
	    }
	    export interface IToken {
	        getBalanceOf(address: string): Promise<string>;
	        getInfo(): Promise<ITokenInfo>;
	        getDecimals(): Promise<number>;
	        getName(): Promise<string>;
	        getSymbol(): Promise<string>;
	    }
		export interface INetwork{
			call(abi: any, contractAddress: string, methodName: string, args?: any, options?: any): Promise<any>;
	        eth: IEth;
	        token(tokenAddress: string): IToken;
	        getBlock(blockHashOrBlockNumber: number|string, returnTransactionObjects?: boolean): Promise<IBlock>;
	        getBlockNumber(): Promise<number>;
	        getPastEvents(abi: any, contractAddress: string|string[], fromBlock: number, toBlock: number|string, events?: string[]): Promise<any>;
	        getTransaction(transactionHash: string): Promise<any>;
		}
		export function network(networkName: string): INetwork;
		export function getAbiEvents(abi: any): any;	
	}
}
export = Plugins.Ethereum;