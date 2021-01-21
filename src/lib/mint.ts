// tslint:disable: no-console

// The following are also available from a combined "@renproject/chains" package.
import { Filecoin } from "@renproject/chains-filecoin";
import { Terra } from "@renproject/chains-terra";
import { BinanceSmartChain, Ethereum } from "@renproject/chains-ethereum";
import {
    Bitcoin,
    BitcoinCash,
    Dogecoin,
    Zcash,
} from "@renproject/chains-bitcoin";
import {
    getRenNetworkDetails,
    LockChain,
    LogLevel,
    MintChain,
    SimpleLogger,
    TxStatus,
} from "@renproject/interfaces";
import RenJS from "@renproject/ren";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import { sleep } from "@renproject/utils";
import { BurnAndRelease } from "@renproject/ren/build/main/burnAndRelease";
import BigNumber from "bignumber.js";

import { NETWORK } from "../network";
import { BurnDetails, DepositDetails } from "../ui/useTransactionStorage";
import { Asset, Chain } from "./chains";

export const logLevel = LogLevel.Trace;

/*******************************************************************************
 * MINTING
 ******************************************************************************/

// Map a mint chain name and mint parameters to a MintChain object.
export const getMintChainObject = (
    mintChain: Chain,
    mintChainProvider: any,
    asset: string,
    recipientAddress?: string,
    amount?: string
): MintChain => {
    // const b = Buffer.from([]);

    switch (mintChain) {
        case Chain.Ethereum:
            let network = NETWORK;
            if (asset && ["BTC", "ZEC", "BCH"].indexOf(asset) >= 0) {
                if (network.name === "mainnet-v0.3") {
                    network = getRenNetworkDetails("mainnet");
                } else if (network.name === "testnet-v0.3") {
                    network = getRenNetworkDetails("testnet");
                }
            }
            let eth = Ethereum(mintChainProvider, network);
            eth = recipientAddress
                ? eth.Account({
                      address: recipientAddress,
                      value: amount,
                  })
                : eth;
            return eth as any;
        case Chain.BSC:
            let bsc = BinanceSmartChain(
                mintChainProvider,
                NETWORK.isTestnet ? "testnet" : "mainnet"
            );
            bsc = recipientAddress
                ? bsc.Account({
                      address: recipientAddress,
                      value: amount,
                  })
                : bsc;
            return bsc as any;
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
    setMinimumAmount: (amount: string) => void,
    onDeposit: (txHash: string, deposit: LockAndMintDeposit) => void
) => {
    let from: LockChain;
    switch (asset) {
        case Asset.BTC:
            from = Bitcoin();
            break;
        case Asset.ZEC:
            from = Zcash();
            break;
        case Asset.BCH:
            from = BitcoinCash();
            break;
        case Asset.FIL:
            from = Filecoin();
            break;
        case Asset.LUNA:
            from = Terra();
            break;
        case Asset.DOGE:
            from = Dogecoin();
            break;
        default:
            throw new Error(`Unsupported asset ${asset}.`);
    }
    const to: MintChain = getMintChainObject(
        mintChain,
        mintChainProvider,
        asset,
        recipientAddress
    );

    const decimals = await from.assetDecimals(asset);
    const fees = await renJS.getFees({
        asset,
        // TODO: Fix typing issues.
        from: from as any,
        to: to as any,
    });
    const minimumAmount = new BigNumber(fees.mint).dividedBy(
        new BigNumber(10).exponentiatedBy(decimals)
    );
    setMinimumAmount(minimumAmount.toFixed());

    const lockAndMint = await renJS.lockAndMint({
        asset,
        // TODO: Fix typing issues.
        from: from as any,
        to: to as any,
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
    console.log("Step: deposit.txHash()");
    const hash = await deposit.txHash();

    console.log("Step: deposit.params.to.findTransaction()");
    const findTransaction = await deposit.params.to.findTransaction(
        deposit.params.asset,
        {
            out: {
                sighash: Buffer.from("00".repeat(32), "hex"),
                nhash: deposit._state.nHash!,
            },
        } as any
    );
    console.log("findTransaction", findTransaction);
    if (findTransaction) {
        console.log("Step: returning");
        onStatus(DepositStatus.DONE);
        return;
    }

    deposit._state.logger = new SimpleLogger(
        logLevel,
        `[${hash.slice(0, 6)}] `
    );

    console.log("calling deposit.confirmed()");

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
    let to: LockChain;
    switch (asset) {
        case Asset.BTC:
            // TODO: Fix typing issues.
            to = Bitcoin().Address(recipientAddress);
            break;
        case Asset.ZEC:
            to = Zcash().Address(recipientAddress);
            break;
        case Asset.BCH:
            to = BitcoinCash().Address(recipientAddress);
            break;
        case Asset.FIL:
            to = Filecoin().Address(recipientAddress);
            break;
        case Asset.LUNA:
            to = Terra().Address(recipientAddress);
            break;
        case Asset.DOGE:
            to = Dogecoin().Address(recipientAddress);
            break;
        default:
            throw new Error(`Unsupported asset ${asset}.`);
    }
    await to.initialize(NETWORK);
    if (to.utils.addressIsValid && !to.utils.addressIsValid(recipientAddress)) {
        throw new Error(`Invalid recipient address ${recipientAddress}`);
    }
    const value = new BigNumber(amount)
        .times(new BigNumber(10).exponentiatedBy(await to.assetDecimals(asset)))
        .toFixed();
    const from: MintChain = getMintChainObject(
        mintChain,
        mintChainProvider,
        asset,
        fromAddress,
        value
    );

    const burnAndRelease = await renJS.burnAndRelease({
        asset,
        from: from as any,
        // TODO: Fix typing issues.
        to: ((to as any) as LockChain) as any,
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
