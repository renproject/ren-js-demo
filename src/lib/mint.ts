// tslint:disable: no-console

// The following are also available from a combined "@renproject/chains" package.
import { Filecoin } from "@renproject/chains-filecoin";
import { BinanceSmartChain, Ethereum } from "@renproject/chains-ethereum";
import {
    Bitcoin,
    BitcoinCash,
    Dogecoin,
    Zcash,
} from "@renproject/chains-bitcoin";
import {
    LockChain,
    LogLevel,
    MintChain,
    SimpleLogger,
    TxStatus,
} from "@renproject/interfaces";
import RenJS from "@renproject/ren";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import { Ox, sleep } from "@renproject/utils";
import { BurnAndRelease } from "@renproject/ren/build/main/burnAndRelease";
import BigNumber from "bignumber.js";

import { BurnDetails, DepositDetails } from "../ui/useTransactionStorage";
import { Asset, Chain } from "./chains";

export const logLevel = LogLevel.Log;

/*******************************************************************************
 * MINTING
 ******************************************************************************/

// Map a mint chain name and mint parameters to a MintChain object.
export const getMintChainObject = (
    mintChain: Chain,
    mintChainProvider: any,
    recipientAddress?: string,
    amount?: string
): MintChain => {
    switch (mintChain) {
        case Chain.Ethereum:
            let eth = Ethereum(mintChainProvider);
            eth = recipientAddress
                ? eth.Account({
                      address: recipientAddress,
                      value: amount,
                  })
                : eth;
            return eth;
        case Chain.BSC:
            let bsc = BinanceSmartChain(mintChainProvider, "mainnet");
            bsc = recipientAddress
                ? bsc.Account({
                      address: recipientAddress,
                      value: amount,
                  })
                : bsc;
            return bsc;
        default:
            throw new Error(`Unsupported chain ${mintChain}.`);
    }
};

export const startMint = async (
    renJS: RenJS,
    mintChain: Chain,
    mintChainProvider: any,
    asset: Asset,
    recipientAddress: string,
    showAddress: (
        address: string | { address: string; params?: string }
    ) => void,
    onDeposit: (txHash: string, deposit: LockAndMintDeposit) => void
) => {
    let from: LockChain;
    switch (asset) {
        case Asset.BTC:
            // TODO: Fix typing issues.
            from = (Bitcoin() as unknown) as LockChain;
            break;
        case Asset.ZEC:
            from = (Zcash() as unknown) as LockChain;
            break;
        case Asset.BCH:
            from = (BitcoinCash() as unknown) as LockChain;
            break;
        case Asset.FIL:
            from = (Filecoin() as unknown) as LockChain;
            break;
        // case Asset.DOGE:
        //     from = (Dogecoin() as unknown) as LockChain;
        //     break;
        default:
            throw new Error(`Unsupported asset ${asset}.`);
    }
    const to: MintChain = getMintChainObject(
        mintChain,
        mintChainProvider,
        recipientAddress
    );

    const lockAndMint = await renJS.lockAndMint({
        asset,
        from,
        to,
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
    onTransactionHash: (txHash: string) => void
) => {
    const hash = await deposit.txHash();

    const findTransaction = await deposit.params.to.findTransaction(
        deposit.params.asset,
        {
            out: {
                sighash: Buffer.from("00".repeat(32), "hex"),
                nhash: deposit._state.nHash!,
            },
        } as any
    );
    console.log(
        "nHash: ",
        Ox(deposit._state.nHash!),
        "findTransaction:",
        findTransaction
    );
    if (findTransaction) {
        onStatus(DepositStatus.DONE);
        return;
    }

    deposit._state.logger = new SimpleLogger(
        logLevel,
        `[${hash.slice(0, 6)}] `
    );

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
    onTransactionHash: (txHash: string) => void
) => {
    await deposit.mint().on("transactionHash", onTransactionHash);

    onStatus(DepositStatus.DONE);
};

/*******************************************************************************
 * BURNING
 ******************************************************************************/

export enum BurnStatus {
    BURNT = "Burnt",
    DONE = "Done",
    ERROR = "Error",
}

export const startBurn = async (
    renJS: RenJS,
    mintChain: Chain,
    mintChainProvider: any,
    asset: Asset,
    recipientAddress: string,
    amount: string,
    fromAddress: string,
    updateTransaction: (
        txHash: string,
        status: Partial<BurnDetails> | Partial<DepositDetails>
    ) => void
): Promise<BurnAndRelease> => {
    let to;
    switch (asset) {
        case Asset.FIL:
            to = Filecoin().Address(recipientAddress);
            break;
        case Asset.BTC:
            to = Bitcoin().Address(recipientAddress);
            break;
        default:
            throw new Error(`Unsupported asset ${asset}.`);
    }
    const value = new BigNumber(amount)
        .times(new BigNumber(10).exponentiatedBy(to.assetDecimals(asset)))
        .toFixed();
    const from: MintChain = getMintChainObject(
        mintChain,
        mintChainProvider,
        fromAddress,
        value
    );

    const burnAndRelease = await renJS.burnAndRelease({
        asset,
        from,
        // TODO: Fix typing issues.
        to: (to as any) as LockChain,
    });

    // const burnPayload =
    //     burnAndRelease.params.to.burnPayload &&
    //     (await burnAndRelease.params.to.burnPayload());

    // burnAndRelease.params.contractCalls =
    //     burnAndRelease.params.contractCalls ||
    //     (burnAndRelease.params.from.contractCalls &&
    //         (await burnAndRelease.params.from.contractCalls(
    //             EventType.BurnAndRelease,
    //             burnAndRelease.params.asset,
    //             burnPayload
    //         )));

    let txHash: string | undefined;

    await burnAndRelease.burn().on("confirmation", (confs) => {
        if (txHash) {
            updateTransaction(txHash, {
                confirmations: confs,
                targetConfs: 15,
            });
        }
    });

    txHash = await burnAndRelease.txHash();

    burnAndRelease
        .release()
        .on("status", (renVMStatus: TxStatus) => {
            if (txHash) {
                updateTransaction(txHash, { renVMStatus });
            }
        })
        .then(() => {
            if (txHash) {
                updateTransaction(txHash, { status: BurnStatus.DONE });
            }
        });

    // TODO: Fix typing issues.
    return (burnAndRelease as any) as BurnAndRelease;
};
