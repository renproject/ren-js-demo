// tslint:disable: no-console react-this-binding-issue

import * as React from "react";

import RenJS from "@renproject/ren";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import CopyToClipboard from "react-copy-to-clipboard";
import { Loading } from "@renproject/react-components";

import { Asset, Chain } from "../lib/chains";
import { NETWORK } from "../network";
import { ReactComponent as MetaMaskLogo } from "./styles/metamask.svg";

interface Props {
    asset: Asset;
    mintChain: Chain;
    renJS: RenJS;
    mintChainProvider: any | null | undefined;
    startMint: (
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
    ) => Promise<void>;
    connectMintChain: () => void;
    addDeposit: (txHash: string, deposit: LockAndMintDeposit) => void;
    getDefaultMintChainAddress: () => Promise<string> | string;
    addressIsValid: (address: string) => boolean;
}

const ClickToCopy = ({ text }: { text: string }) => {
    const [copied, setCopied] = React.useState(false);
    const onClick = React.useCallback(() => {
        if (copied) {
            return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2 * 1000);
    }, [setCopied, copied]);
    return (
        <CopyToClipboard text={text} onClick={onClick}>
            <span
                onClick={onClick}
                className={`copy ${copied ? "copied" : ""}`}
            >
                {copied ? "Copied" : text}
            </span>
        </CopyToClipboard>
    );
};

export const MintForm: React.FC<Props> = ({
    asset,
    mintChain,
    renJS,
    mintChainProvider,
    startMint,
    connectMintChain,
    addDeposit,
    getDefaultMintChainAddress,
    addressIsValid,
}) => {
    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null
    );

    const [recipientAddress, setRecipientAddress] = React.useState<
        string | null
    >(null);

    const [generatingAddress, setGeneratingAddress] = React.useState(false);
    const [depositAddress, setDepositAddress] = React.useState<
        string | { address: string; params?: string; memo?: string } | null
    >(null);

    const [minimumAmount, setMinimumAmount] = React.useState<string | null>(
        null
    );

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setGeneratingAddress(true);
            setDepositAddress(null);

            if (!mintChainProvider) {
                return;
            }

            if (!recipientAddress) {
                setErrorMessage(`Please enter a valid ${mintChain} address.`);
                return;
            }
            setErrorMessage(null);
            try {
                await startMint(
                    renJS,
                    mintChain,
                    mintChainProvider,
                    asset,
                    recipientAddress,
                    setDepositAddress,
                    setMinimumAmount,
                    addDeposit
                );
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    String(
                        error.message || error.error || JSON.stringify(error)
                    )
                );
            }
            setGeneratingAddress(false);
        },
        [
            asset,
            renJS,
            recipientAddress,
            mintChainProvider,
            addDeposit,
            mintChain,
            startMint,
        ]
    );

    const useMetaMaskAccount = React.useCallback(async () => {
        if (!mintChainProvider) {
            setErrorMessage("Please use a Web3 browser");
            return;
        }
        try {
            setRecipientAddress(await getDefaultMintChainAddress());
        } catch (error) {
            console.error(error);
        }
    }, [mintChainProvider, setRecipientAddress, getDefaultMintChainAddress]);

    const validAddress: boolean = React.useMemo(
        () => (recipientAddress ? addressIsValid(recipientAddress) : false),
        [recipientAddress, addressIsValid]
    );

    return (
        <form
            onSubmit={onSubmit}
            className={generatingAddress ? "disabled" : ""}
        >
            <div className="send">
                <input
                    className="no-right-border"
                    value={recipientAddress || ""}
                    onChange={(e) => {
                        setRecipientAddress(e.target.value);
                    }}
                    placeholder={`Recipient (${
                        NETWORK.isTestnet ? "testnet" : ""
                    } ${mintChain} address)`}
                />
                <div
                    role="button"
                    className={`box box-action no-left-border ${
                        !mintChainProvider ? "disabled" : ""
                    }`}
                    onClick={mintChainProvider ? useMetaMaskAccount : undefined}
                >
                    <MetaMaskLogo />
                </div>
            </div>
            <div className="send">
                {mintChainProvider ? (
                    <button
                        disabled={generatingAddress || !validAddress}
                        type="submit"
                        className={`button blue ${
                            generatingAddress || !validAddress ? "disabled" : ""
                        }`}
                    >
                        {generatingAddress ? <Loading alt={true} /> : <>Mint</>}
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
            {depositAddress ? (
                <>
                    <div className="deposit-address">
                        Deposit{" "}
                        {minimumAmount ? <>at least {minimumAmount}</> : null}{" "}
                        <b>{asset}</b> to
                        {typeof depositAddress === "string" ? (
                            <p>
                                <b>Address:</b>{" "}
                                <ClickToCopy text={depositAddress} />
                            </p>
                        ) : (
                            <>
                                <p>
                                    <b>Address:</b>{" "}
                                    <ClickToCopy
                                        text={depositAddress.address}
                                    />
                                </p>
                                {depositAddress.params ? (
                                    <div>
                                        <b>Params:</b>
                                        <p>
                                            Base64:{" "}
                                            <ClickToCopy
                                                text={depositAddress.params}
                                            />
                                        </p>
                                        <p>
                                            Hex:{" "}
                                            <ClickToCopy
                                                text={Buffer.from(
                                                    depositAddress.params,
                                                    "base64"
                                                ).toString("hex")}
                                            />
                                        </p>
                                    </div>
                                ) : null}
                                {depositAddress.memo ? (
                                    <div>
                                        <b>Params:</b>
                                        <p>
                                            <ClickToCopy
                                                text={depositAddress.memo}
                                            />
                                        </p>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                    <div className="deposit-loading">
                        Watching for deposits...{" "}
                        <Loading style={{ display: "inline-block" }} />
                    </div>
                </>
            ) : null}

            {errorMessage ? <p className="box red">{errorMessage}</p> : <></>}
        </form>
    );
};
