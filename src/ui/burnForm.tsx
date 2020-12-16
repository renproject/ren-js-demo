import * as React from "react";

import BigNumber from "bignumber.js";
import RenJS from "@renproject/ren";
import { BurnAndRelease } from "@renproject/ren/build/main/burnAndRelease";
import { Loading } from "@renproject/react-components";

import { Asset, Assets, Chain } from "../lib/chains";
import { NETWORK } from "../network";
import { BurnDetails, DepositDetails } from "./useTransactionStorage";

interface Props {
    asset: Asset;
    renJS: RenJS;
    mintChain: Chain;
    mintChainProvider: any | null;
    balance: string | null;
    addBurn: (txHash: string, deposit: BurnAndRelease) => void;
    startBurn: (
        renJS: RenJS,
        mintChain: Chain,
        mintChainProvider: any,
        asset: Asset,
        recipientAddress: string,
        amount: string,
        fromAddress: string,
        updateTransaction: (
            txHash: string,
            transaction: Partial<BurnDetails | DepositDetails>
        ) => void
    ) => Promise<BurnAndRelease>;
    connectMintChain: () => void;
    getDefaultMintChainAddress: () => Promise<string> | string;
    updateTransaction: (
        txHash: string,
        transaction: Partial<BurnDetails | DepositDetails>
    ) => void;
}

export const BurnForm: React.FC<Props> = ({
    asset,
    renJS,
    mintChain,
    mintChainProvider,
    balance,
    startBurn,
    connectMintChain,
    getDefaultMintChainAddress,
    addBurn,
    updateTransaction,
}) => {
    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null
    );

    const [recipientAddress, setRecipientAddress] = React.useState("");
    const [amount, setAmount] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitting(true);
            if (!mintChainProvider) {
                setErrorMessage("Please use a Web3 browser");
                return;
            }
            if (!amount) {
                setErrorMessage("Please enter a valid amount.");
                return;
            }
            if (new BigNumber(amount).lte(0.00005)) {
                setErrorMessage("Amount must be greater than 0.00005");
                return;
            }
            setErrorMessage(null);
            try {
                const burn = await startBurn(
                    renJS,
                    mintChain,
                    mintChainProvider,
                    asset,
                    recipientAddress,
                    amount,
                    await getDefaultMintChainAddress(),
                    updateTransaction
                );
                const txHash = await burn.txHash();
                if (burn.burnDetails) {
                    addBurn(txHash, burn);
                }
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    String(
                        error.message || error.error || JSON.stringify(error)
                    )
                );
            }
            setSubmitting(false);
        },
        [
            amount,
            mintChainProvider,
            asset,
            mintChain,
            recipientAddress,
            renJS,
            startBurn,
            updateTransaction,
            addBurn,
            getDefaultMintChainAddress,
        ]
    );

    const burnMaximumValue = React.useCallback(() => {
        if (balance === null) {
            return;
        }
        setAmount(balance);
    }, [balance]);

    return (
        <form onSubmit={onSubmit}>
            <div className="send">
                <input
                    value={recipientAddress}
                    onChange={(e) => {
                        setRecipientAddress(e.target.value);
                    }}
                    placeholder={`Recipient (${
                        NETWORK.isTestnet ? "Testnet" : ""
                    } ${
                        (
                            Assets.get(asset) || {
                                name: asset.toUpperCase(),
                            }
                        ).name
                    } address)`}
                />
            </div>
            <div className="send">
                <div className="send">
                    <input
                        className={"no-right-border"}
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                        }}
                        placeholder="Amount"
                    />
                    <div
                        role="button"
                        className={`box box-action box-blue ${
                            !balance ? "disabled" : ""
                        }`}
                        onClick={balance ? burnMaximumValue : undefined}
                    >
                        max
                    </div>

                    <div className="box">{asset.toUpperCase()}</div>
                </div>
            </div>
            <div className="send">
                {mintChainProvider ? (
                    <button
                        type="submit"
                        disabled={!amount || !recipientAddress || submitting}
                        className={`button blue`}
                    >
                        {submitting ? <Loading alt={true} /> : <>Burn</>}
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`button light-blue`}
                        onClick={connectMintChain}
                    >
                        Connect {mintChain} wallet
                    </button>
                )}
            </div>
            {errorMessage ? <p className="box red">{errorMessage}</p> : <></>}
        </form>
    );
};
