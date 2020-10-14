// tslint:disable: no-console react-this-binding-issue

import * as React from "react";

import { Loading, SelectMarket } from "@renproject/react-components";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import { OrderedMap } from "immutable";

import { Wallet } from "../lib/ethereum";
import { DepositStatus, stagingRenJS } from "../lib/mint";
import { BurnForm } from "./burnForm";
import { DepositObject } from "./depositObject";
import { MintForm } from "./mintForm";

type Asset = string;
export const Assets = new Map<Asset, { symbol: Asset; name: string }>()
    .set("FIL", {
        symbol: "FIL",
        name: "Filecoin",
    })
    .set("BTC", {
        symbol: "BTC",
        name: "Bitcoin",
    });
const defaultAsset = "FIL";

const NETWORK = "testnet";

enum Tab {
    Mint = "Mint",
    Burn = "Burn",
}

export const Main = () => {
    const [asset, setAsset] = React.useState<Asset>(defaultAsset);
    const [wallet, setWallet] = React.useState<Wallet | null>(null);

    const isTestnet = NETWORK === "testnet" || NETWORK === "devnet";

    React.useEffect(() => {
        (async () => {
            setWallet(await Wallet.getWallet(isTestnet));
        })().catch((error) => setErrorMessage(error.message));
    }, [isTestnet]);

    const renJS = React.useMemo(() => stagingRenJS(), []);

    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null,
    );

    const [balance, setBalance] = React.useState<string | null>(null);

    const onMarketChange = React.useCallback(
        (newAsset) => {
            setAsset(newAsset);
        },
        [setAsset],
    );

    React.useEffect(() => {
        (async () => {
            setBalance(null);
            if (wallet) {
                Wallet.getBalance(wallet, asset)
                    .then(setBalance)
                    .catch(console.error);
            } else {
                setBalance("?");
            }
        })().catch(console.error);
    }, [wallet, asset, setBalance]);

    const [tab, setTab] = React.useState<Tab.Mint | Tab.Burn>(Tab.Mint);

    const [deposits, setDeposits] = React.useState(
        OrderedMap<
            string,
            { deposit: LockAndMintDeposit; status: DepositStatus }
        >(),
    );

    const addDeposit = React.useCallback(
        (txHash: string, deposit: LockAndMintDeposit) => {
            setDeposits((deposits) =>
                deposits.get(txHash)
                    ? deposits
                    : deposits.set(txHash, {
                          deposit: deposit,
                          status: DepositStatus.DETECTED,
                      }),
            );
        },
        [setDeposits],
    );

    const updateStatus = React.useCallback(
        (txHash: string, status: DepositStatus) => {
            setDeposits((deposits) =>
                deposits.set(txHash, { ...deposits.get(txHash)!, status }),
            );
        },
        [setDeposits],
    );

    return (
        <>
            {isTestnet ? (
                <div className="box testnet-warning">TESTNET</div>
            ) : null}
            <div className="test-environment">
                <SelectMarket
                    top
                    thisToken={asset}
                    otherToken={""}
                    allTokens={Assets}
                    key={"top"}
                    onMarketChange={onMarketChange}
                    getMarket={() => {
                        return undefined;
                    }}
                />
                <div className="box">
                    Your ren{asset} balance: {balance ? balance : <Loading />}{" "}
                    ren{asset}
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
                        className={`tab disabled ${
                            tab === Tab.Burn ? "tab--selected" : ""
                        }`}
                        // onClick={() => setTab(Tab.Burn)}
                    >
                        Burn
                    </div>
                </div>

                <div className="form-outer">
                    {tab === Tab.Mint ? (
                        <MintForm
                            // Reset state when the asset is changed.
                            key={asset}
                            asset={asset}
                            web3={wallet}
                            renJS={renJS}
                            network={NETWORK}
                            addDeposit={addDeposit}
                        />
                    ) : (
                        <BurnForm
                            // Reset state when the asset is changed.
                            key={asset}
                            asset={asset}
                            web3={wallet}
                            renJS={renJS}
                            network={NETWORK}
                            balance={balance}
                        />
                    )}
                </div>

                {errorMessage ? (
                    <p className="box red">{errorMessage}</p>
                ) : (
                    <></>
                )}
            </div>

            <div className="deposits">
                {Array.from(deposits.keys()).map((txHash) => {
                    const { deposit, status } = deposits.get(txHash)!;
                    return (
                        <DepositObject
                            key={txHash}
                            txHash={txHash}
                            deposit={deposit}
                            status={status}
                            updateStatus={updateStatus}
                        />
                    );
                })}
            </div>
        </>
    );
};
