/**
 *
 *
 *
 * These functions will be abstracted away behind Ren's `multiwallet` library.
 *
 *
 *
 */

import Web3 from "web3";
import { Ethereum } from "@renproject/chains-ethereum";
import { AbiItem, RenNetwork } from "@renproject/interfaces";
import BigNumber from "bignumber.js";
import { HttpProvider } from "web3-providers";

import ERC20ABI from "../lib/ABIs/erc20ABI.json";
import { Chain } from "./chains";
import { getMintChainObject } from "./mint";

export type Wallet = Web3;

interface InjectedEthereum extends HttpProvider {
    enable: () => Promise<void>;
}

// tslint:disable-next-line: no-any
declare global {
    interface Window {
        ethereum?: InjectedEthereum;
        web3?: Web3 | undefined;
    }
}

// const getWallet = async (isTestnet: boolean): Promise<Wallet> => {
//     if (window.ethereum && window.web3) {
//         await window.ethereum.enable();
//         const wallet = new Web3(window.web3.currentProvider);
//         const networkID = await wallet.eth.net.getId();
//         if (isTestnet && networkID !== 4) {
//             throw new Error("Please change your Web3 wallet to Rinkeby");
//         } else if (!isTestnet && networkID !== 1) {
//             throw new Error("Please change your Web3 wallet to Mainnet");
//         }
//         return wallet;
//     }
//     throw new Error("Please use a Web3 browser.");
// };

const getBalance = async (
    mintChain: Chain,
    mintChainProvider: any,
    token: string
): Promise<string> => {
    const web3 = new Web3(mintChainProvider);
    const web3Address = (await web3.eth.getAccounts())[0];
    const tokenAddress = await (getMintChainObject(
        mintChain,
        mintChainProvider
    ) as Ethereum)
        .initialize(RenNetwork.MainnetVDot3)
        .getTokenContractAddress(token);
    const tokenContract = new web3.eth.Contract(
        ERC20ABI as AbiItem[],
        tokenAddress
    );
    const decimals = await tokenContract.methods.decimals().call();
    const balance = await tokenContract.methods.balanceOf(web3Address).call();
    const amount = new BigNumber(balance)
        .div(
            new BigNumber(10).exponentiatedBy(
                new BigNumber(decimals).toNumber()
            )
        )
        .toFixed(4);
    return amount;
};

const addressIsValid = (address: string): boolean => {
    return !!(address && address.match(/(^0x[A-Fa-f0-9]{40}$)|(^.*\.eth$)/));
};

export const Wallet = {
    // getWallet,
    getBalance,
    addressIsValid,
};
