// tslint:disable: no-console react-this-binding-issue

import * as React from "react";

import BigNumber from "bignumber.js";
import Web3 from "web3";
import RenJS from "@renproject/ren";

import { Assets } from "./main";

interface Props {
    asset: string;
    renJS: RenJS;
    web3: Web3 | null;
    network: string;
    balance: string | null;
}

export const BurnForm: React.FC<Props> = ({
    asset,
    renJS,
    web3,
    network,
    balance,
}) => {
    const isTestnet = network === "testnet" || network === "devnet";

    const [errorMessage, setErrorMessage] = React.useState(
        null as string | null,
    );

    const [recipientAddress, setRecipientAddress] = React.useState("");
    const [amount, setAmount] = React.useState("");

    const isPending = React.useMemo(() => {
        return !recipientAddress || recipientAddress === "";
    }, [recipientAddress]);

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!web3) {
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
                // TODO
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    String(
                        error.message || error.error || JSON.stringify(error),
                    ),
                );
            }
        },
        [amount, web3],
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
                    placeholder={`Recipient (${isTestnet ? "Testnet" : ""} ${
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
                    {!isPending ? (
                        <div
                            role="button"
                            className={`box box-action box-blue ${
                                !balance ? "disabled" : ""
                            }`}
                            onClick={balance ? burnMaximumValue : undefined}
                        >
                            max
                        </div>
                    ) : (
                        <></>
                    )}
                    <div className="box">{asset.toUpperCase()}</div>
                </div>
            </div>
            <div className="send">
                <button
                    type="submit"
                    className={`blue ${
                        !amount || /* !validAddress */ false ? "disabled" : ""
                    }`}
                >
                    Burn
                </button>
            </div>
            {errorMessage ? <p className="box red">{errorMessage}</p> : <></>}
        </form>
    );
};
