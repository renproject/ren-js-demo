// tslint:disable: no-console

// The following are also available from a combined "@renproject/chains" package.
import { Filecoin } from "@renproject/chains-filecoin";
import { Ethereum } from "@renproject/chains-ethereum";
import { Bitcoin } from "@renproject/chains-bitcoin";
import {
    LockChain,
    LogLevel,
    SimpleLogger,
    TxStatus,
} from "@renproject/interfaces";
import { renRinkeby } from "@renproject/networks";
import {
    HttpProvider,
    OverwriteProvider,
    Provider,
} from "@renproject/provider";
import RenJS from "@renproject/ren";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import { AbstractRenVMProvider } from "@renproject/rpc";
import {
    RenVMParams,
    RenVMProvider,
    RenVMProviderInterface,
    RenVMResponses,
} from "@renproject/rpc/build/main/v2";
import { Ox, sleep } from "@renproject/utils";
import Web3 from "web3";

const logLevel = LogLevel.Log;

// Override RenJS's provider with staging darknode network.
export const stagingRenJS = () => {
    const httpProvider = new HttpProvider<RenVMParams, RenVMResponses>(
        // "https://lightnode-new-testnet.herokuapp.com/",
        "http://34.239.188.210:18515", // tslint:disable-line: no-http-string
    ) as Provider<RenVMParams, RenVMResponses>;
    const rpcProvider = new OverwriteProvider<RenVMParams, RenVMResponses>(
        httpProvider,
    ) as RenVMProviderInterface;
    const renVMProvider = new RenVMProvider(
        "testnet",
        rpcProvider,
    ) as AbstractRenVMProvider;

    return new RenJS(renVMProvider, { logLevel });
};

export const startMint = async (
    web3: Web3,
    renJS: RenJS,
    recipientAddress: string,
    showAddress: (
        address: string | { address: string; params?: string },
    ) => void,
    asset: string,
    onDeposit: (txHash: string, deposit: LockAndMintDeposit) => void,
) => {
    let from: LockChain;
    switch (asset) {
        case "FIL":
            // TODO: Fix typing issues.
            from = (Filecoin() as unknown) as LockChain;
            break;
        case "BTC":
            from = (Bitcoin() as unknown) as LockChain;
            break;
        default:
            throw new Error(`Unsupported asset ${asset}.`);
    }
    const to = Ethereum(web3.currentProvider, undefined, renRinkeby);

    const lockAndMint = await renJS.lockAndMint({
        asset,
        from,
        to: to.Account({
            address: recipientAddress,
        }),

        nonce: Ox("00".repeat(32)),
    });

    if (lockAndMint.gatewayAddress) {
        showAddress(lockAndMint.gatewayAddress);
    }

    lockAndMint.on("deposit", async (deposit) => {
        const txHash = await deposit.txHash();
        // TODO: Ensure deposit types don't have to be typecast.
        onDeposit(txHash, (deposit as unknown) as LockAndMintDeposit);
    });
};

export enum DepositStatus {
    DETECTED = "Detected",
    CONFIRMED = "Confirmed",
    SIGNED = "Signed",
    DONE = "Done",
    ERROR = "Error",
}

export const handleDeposit = async (
    deposit: LockAndMintDeposit,
    onStatus: (status: DepositStatus) => void,
    onConfirmation: (confs: number, target: number) => void,
    onRenVMStatus: (status: TxStatus) => void,
    onTransactionHash: (txHash: string) => void,
) => {
    const hash = await deposit.txHash();

    deposit._logger = new SimpleLogger(logLevel, `[${hash.slice(0, 6)}] `);

    await deposit
        .confirmed()
        .on("target", onConfirmation)
        .on("confirmation", onConfirmation);

    onStatus(DepositStatus.CONFIRMED);

    let retries = 1;
    let lastError;
    while (retries) {
        try {
            await deposit.signed().on("status", onRenVMStatus);
            break;
        } catch (error) {
            console.error(error);
            lastError = error;
        }
        retries--;
        if (retries) {
            await sleep(10);
        }
    }
    if (retries === 0) {
        throw new Error(lastError);
    }

    const mintTransaction = await deposit.findTransaction();
    if (mintTransaction) {
        onTransactionHash(mintTransaction as string);
        onStatus(DepositStatus.DONE);
        return;
    }

    onStatus(DepositStatus.SIGNED);
};

export const submitDeposit = async (
    deposit: LockAndMintDeposit,
    onStatus: (status: DepositStatus) => void,
    onTransactionHash: (txHash: string) => void,
) => {
    await deposit.mint().on("transactionHash", onTransactionHash);

    onStatus(DepositStatus.DONE);
};
