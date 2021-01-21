// tslint:disable: no-console react-this-binding-issue

import * as React from "react";

import { Loading, SelectMarket } from "@renproject/react-components";
import { useMultiwallet } from "@renproject/multiwallet-ui";
import RenJS from "@renproject/ren";
import { RenNetwork } from "@renproject/interfaces";

import {
    Asset,
    Assets,
    Chain,
    Chains,
    defaultAsset,
    defaultMintChain,
} from "../lib/chains";
import { Wallet } from "../lib/ethereum";
import { logLevel, startBurn, startMint } from "../lib/mint";
import { NETWORK } from "../network";
import { BurnForm } from "./burnForm";
import { BurnObject } from "./burnObject";
import { ConnectWallet } from "./connectWallet";
import { DepositObject } from "./depositObject";
import { MintForm } from "./mintForm";
import { useTransactionStorage } from "./useTransactionStorage";

enum Tab {
    Mint = "Mint",
    Burn = "Burn",
}

export const Main = () => {
    const { enabledChains } = useMultiwallet();

    const [asset, setAsset] = React.useState<Asset>(defaultAsset);
    const [mintChain, setMintChain] = React.useState<Chain>(defaultMintChain);

    const renJS = React.useMemo(
        () =>
            new RenJS(
                NETWORK.isTestnet ? RenNetwork.Testnet : RenNetwork.Mainnet,
                { logLevel }
            ),
        []
    );

    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null
    );

    const [balance, setBalance] = React.useState<string | null>(null);

    const mintChainProvider =
        enabledChains[mintChain] && enabledChains[mintChain].provider;

    const updateBalance = React.useCallback(
        (assetIn?: Asset) => {
            setErrorMessage(null);

            if (assetIn && assetIn !== asset) {
                return;
            }

            setBalance(null);

            if (mintChainProvider) {
                Wallet.getBalance(mintChain, mintChainProvider, asset)
                    .then(setBalance)
                    .catch((error) => setErrorMessage(error.toString()));
            } else {
                setBalance("?");
            }
        },
        [mintChain, mintChainProvider, asset, setBalance]
    );

    React.useEffect(() => {
        (async () => {
            updateBalance();
        })().catch(console.error);
    }, [updateBalance]);

    const [tab, setTab] = React.useState<Tab.Mint | Tab.Burn>(Tab.Mint);

    const {
        deposits,
        addDeposit,
        addBurn,
        updateTransaction,
    } = useTransactionStorage(updateBalance);

    // Multiwallet modal
    const [multiwalletChain, setMultiwalletChain] = React.useState<
        string | null
    >(null);
    const closeMultiwallet = () => setMultiwalletChain(null);
    const connectMintChain = React.useCallback(
        () => setMultiwalletChain(mintChain),
        [mintChain, setMultiwalletChain]
    );
    // const connectBurnChain = React.useCallback(() => setMultiwalletChain(mintChain), [mintChain, setMultiwalletChain]);

    return (
        <>
            {NETWORK.isTestnet ? (
                <div className="box testnet-warning">TESTNET</div>
            ) : null}
            <div className="test-environment">
                <SelectMarket
                    top
                    thisToken={asset}
                    otherToken={""}
                    allTokens={Assets}
                    key={"assetSelector"}
                    onMarketChange={setAsset as (asset: string) => void}
                    getMarket={() => undefined}
                />
                <SelectMarket
                    top
                    thisToken={mintChain}
                    otherToken={""}
                    allTokens={Chains}
                    key={"chainSelector"}
                    onMarketChange={setMintChain as (chain: string) => void}
                    getMarket={() => undefined}
                />
                <div className="box">
                    {mintChainProvider ? (
                        <>
                            Your ren{asset} balance:{" "}
                            {balance ? balance : <Loading />} ren{asset}
                        </>
                    ) : (
                        <>Connect to see your balance.</>
                    )}
                </div>

                <div>
                    <div
                        className={`tab ${
                            tab === Tab.Mint ? "tab--selected" : ""
                        }`}
                        onClick={() => setTab(Tab.Mint)}
                    >
                        Mint
                    </div>
                    <div
                        className={`tab ${
                            tab === Tab.Burn ? "tab--selected" : ""
                        }`}
                        onClick={() => setTab(Tab.Burn)}
                    >
                        Burn
                    </div>
                </div>

                <div className="form-outer">
                    {tab === Tab.Mint ? (
                        <MintForm
                            // Reset state when the asset is changed.
                            key={asset + mintChain}
                            asset={asset}
                            mintChain={mintChain}
                            mintChainProvider={mintChainProvider}
                            renJS={renJS}
                            startMint={startMint}
                            addDeposit={addDeposit}
                            connectMintChain={connectMintChain}
                            getDefaultMintChainAddress={() =>
                                enabledChains[mintChain].account as string
                            }
                            addressIsValid={() => true}
                        />
                    ) : (
                        <BurnForm
                            // Reset state when the asset is changed.
                            key={asset + mintChain}
                            asset={asset}
                            mintChain={mintChain}
                            mintChainProvider={
                                enabledChains[mintChain] &&
                                enabledChains[mintChain].provider
                            }
                            connectMintChain={connectMintChain}
                            startBurn={startBurn}
                            addBurn={addBurn}
                            renJS={renJS}
                            balance={balance}
                            updateTransaction={updateTransaction}
                            getDefaultMintChainAddress={() =>
                                enabledChains[mintChain].account as string
                            }
                        />
                    )}
                </div>

                {errorMessage ? (
                    <p className="box red">{errorMessage}</p>
                ) : (
                    <></>
                )}
            </div>

            <div className="connect-wallets">
                <ConnectWallet
                    chain={multiwalletChain}
                    close={closeMultiwallet}
                />
            </div>

            <div className="deposits">
                {Array.from(deposits.keys())
                    .map((txHash) => {
                        const depositDetails = deposits.get(txHash)!;
                        if (depositDetails.type === "BURN") {
                            const {
                                burn,
                                status,
                                confirmations,
                                targetConfs,
                                renVMStatus,
                            } = depositDetails;
                            return (
                                <BurnObject
                                    key={txHash}
                                    txHash={txHash}
                                    burn={burn}
                                    status={status}
                                    confirmations={confirmations}
                                    targetConfs={targetConfs}
                                    updateTransaction={updateTransaction}
                                    renVMStatus={renVMStatus}
                                />
                            );
                        }
                        const { deposit, status } = depositDetails;
                        return (
                            <DepositObject
                                key={txHash}
                                txHash={txHash}
                                deposit={deposit}
                                status={status}
                                updateTransaction={updateTransaction}
                            />
                        );
                    })
                    .reverse()}
            </div>
        </>
    );
};
