// tslint:disable: no-console react-this-binding-issue

import * as React from "react";

import Web3 from "web3";
import RenJS from "@renproject/ren";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import CopyToClipboard from "react-copy-to-clipboard";
import { Loading } from "@renproject/react-components";

import { startMint } from "../lib/mint";
import { ReactComponent as MetaMaskLogo } from "./styles/metamask.svg";

interface Props {
    asset: string;
    renJS: RenJS;
    web3: Web3 | null;
    network: string;
    addDeposit: (txHash: string, deposit: LockAndMintDeposit) => void;
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
    renJS,
    web3,
    network,
    addDeposit,
}) => {
    const isTestnet = network === "testnet" || network === "devnet";

    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null,
    );

    const [ethereumAddress, setEthereumAddress] = React.useState<string | null>(
        null,
    );

    const [generatingAddress, setGeneratingAddress] = React.useState(false);
    const [depositAddress, setDepositAddress] = React.useState<
        string | { address: string; params?: string } | null
    >(null);

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setGeneratingAddress(true);
            setDepositAddress(null);

            if (!web3) {
                setErrorMessage("Please use a Web3 browser");
                return;
            }
            if (!ethereumAddress) {
                setErrorMessage("Please enter a valid Ethereum address.");
                return;
            }
            setErrorMessage(null);
            try {
                await startMint(
                    web3,
                    renJS,
                    ethereumAddress,
                    setDepositAddress,
                    asset,
                    addDeposit,
                );
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    String(
                        error.message || error.error || JSON.stringify(error),
                    ),
                );
            }
            setGeneratingAddress(false);
        },
        [asset, renJS, ethereumAddress, web3, addDeposit],
    );

    const useMetaMaskAccount = React.useCallback(async () => {
        if (!web3) {
            setErrorMessage("Please use a Web3 browser");
            return;
        }
        try {
            setEthereumAddress((await web3.eth.getAccounts())[0]);
        } catch (error) {
            console.error(error);
        }
    }, [web3, setEthereumAddress]);

    const addressIsValid: boolean = React.useMemo(() => {
        return !!(
            ethereumAddress &&
            ethereumAddress.match(/(^0x[A-Fa-f0-9]{40}$)|(^.*\.eth$)/)
        );
    }, [ethereumAddress]);

    return (
        <form
            onSubmit={onSubmit}
            className={generatingAddress ? "disabled" : ""}
        >
            <div className="send">
                <input
                    className="no-right-border"
                    value={ethereumAddress || ""}
                    onChange={(e) => {
                        setEthereumAddress(e.target.value);
                    }}
                    placeholder={`Recipient (${
                        isTestnet ? "Rinkeby" : "Ethereum"
                    } address)`}
                />
                <div
                    role="button"
                    className="box box-action no-left-border"
                    onClick={useMetaMaskAccount}
                >
                    <MetaMaskLogo />
                </div>
            </div>
            <div className="send">
                <button
                    disabled={generatingAddress || !addressIsValid}
                    type="submit"
                    className={`blue ${
                        generatingAddress || !addressIsValid ? "disabled" : ""
                    }`}
                >
                    {generatingAddress ? <Loading alt={true} /> : <>Mint</>}
                </button>
            </div>
            {depositAddress ? (
                <>
                    <div className="deposit-address">
                        Deposit <b>{asset}</b> to
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
                                                    "base64",
                                                ).toString("hex")}
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
