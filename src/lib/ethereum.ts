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
import { renRinkeby } from "@renproject/networks";
import { AbiItem, RenNetwork } from "@renproject/interfaces";
import BigNumber from "bignumber.js";
import { HttpProvider } from "web3-providers";

import ERC20ABI from "../lib/ABIs/erc20ABI.json";

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

const getWallet = async (isTestnet: boolean): Promise<Wallet> => {
    if (window.ethereum && window.web3) {
        await window.ethereum.enable();
        const wallet = new Web3(window.web3.currentProvider);
        const networkID = await wallet.eth.net.getId();
        if (isTestnet && networkID !== 4) {
            throw new Error("Please change your Web3 wallet to Rinkeby");
        } else if (!isTestnet && networkID !== 1) {
            throw new Error("Please change your Web3 wallet to Mainnet");
        }
        return wallet;
    }
    throw new Error("Please use a Web3 browser.");
};

const getBalance = async (wallet: Wallet, token: string): Promise<string> => {
    const web3Address = (await wallet.eth.getAccounts())[0];
    const tokenAddress = await Ethereum(
        wallet.currentProvider,
        undefined,
        renRinkeby,
    )
        .initialize(RenNetwork.Testnet)
        .getTokenContractAddress(token);
    const tokenContract = new wallet.eth.Contract(
        ERC20ABI as AbiItem[],
        tokenAddress,
    );
    const decimals = await tokenContract.methods.decimals().call();
    const balance = await tokenContract.methods.balanceOf(web3Address).call();
    const amount = new BigNumber(balance)
        .div(
            new BigNumber(10).exponentiatedBy(
                new BigNumber(decimals).toNumber(),
            ),
        )
        .toFixed();
    return amount;
};

export const Wallet = {
    getWallet,
    getBalance,
};
