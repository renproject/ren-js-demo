import * as React from "react";

import { BurnAndRelease } from "@renproject/ren/build/main/burnAndRelease";
import BigNumber from "bignumber.js";
import { Loading } from "@renproject/react-components";
import { TxStatus } from "@renproject/interfaces";

import { BurnStatus } from "../lib/mint";
import { BurnDetails, DepositDetails } from "./useTransactionStorage";

export const ExternalLink: React.FC<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
        {children}
    </a>
);

interface Props {
    txHash: string;
    burn: BurnAndRelease;
    status: BurnStatus;
    confirmations: number;
    targetConfs: number | undefined;
    renVMStatus: TxStatus | undefined;
    updateTransaction: (
        txHash: string,
        transaction: Partial<BurnDetails> | Partial<DepositDetails>
    ) => void;
}

export const BurnObject: React.FC<Props> = ({
    txHash,
    burn,
    status,
    confirmations,
    targetConfs,
    renVMStatus,
    updateTransaction,
}) => {
    const {
        params: { asset, from },
        burnDetails,
    } = burn;

    const [errorMessage] = React.useState<string | null>(null);
    const [showingFullError, setShowingFullError] = React.useState(false);
    const showFullError = React.useCallback(() => setShowingFullError(true), [
        setShowingFullError,
    ]);

    const [amountReadable, setAmountReadable] = React.useState<string | null>(
        null
    );

    React.useEffect(() => {
        (async () => {
            const newValue: string | null =
                (burn.burnDetails &&
                    new BigNumber(burn.burnDetails.amount)
                        .div(
                            new BigNumber(10).exponentiatedBy(
                                await burn.params.to.assetDecimals(
                                    burn.params.asset
                                )
                            )
                        )
                        .toFixed()) ||
                null;
            setAmountReadable(newValue);
        })().catch(console.error);
    });

    return (
        <div className={`deposit ${status === BurnStatus.DONE ? "done" : ""}`}>
            <p>
                <b>
                    Burnt{" "}
                    {amountReadable ? (
                        amountReadable
                    ) : (
                        <Loading style={{ display: "inline-block" }} />
                    )}{" "}
                    {asset}
                </b>
                {burnDetails && burnDetails.to ? (
                    <> to {burnDetails.to}</>
                ) : null}
            </p>
            <p>
                <b>RenVM Hash:</b> {txHash}
            </p>

            <p>
                <b>Status:</b>{" "}
                {status === BurnStatus.BURNT ? (
                    <>
                        Submitting to RenVM...{" "}
                        <Loading style={{ display: "inline-block" }} />
                    </>
                ) : (
                    status
                )}
            </p>

            {status === BurnStatus.BURNT && renVMStatus ? (
                <p>
                    <b>RenVM status:</b> {renVMStatus}
                </p>
            ) : null}

            {status === BurnStatus.BURNT && confirmations !== null ? (
                <p>
                    <b>Confirmations:</b> {confirmations}
                    {targetConfs ? <>/{targetConfs}</> : <></>}
                </p>
            ) : null}

            {burnDetails && burnDetails.transaction ? (
                <p>
                    <b>{from.name} tx:</b>{" "}
                    {from.utils.transactionExplorerLink ? (
                        <ExternalLink
                            href={from.utils.transactionExplorerLink(
                                burnDetails.transaction
                            )}
                        >
                            {from.transactionID(burnDetails.transaction)}
                        </ExternalLink>
                    ) : (
                        burnDetails.transaction
                    )}
                </p>
            ) : null}

            {errorMessage ? (
                <div className="red" onClick={showFullError}>
                    {errorMessage.length > 100 && !showingFullError ? (
                        <>
                            {errorMessage.slice(0, 74)}...{" "}
                            <span
                                style={{ color: "darkgray", cursor: "pointer" }}
                            >
                                (click for full error)
                            </span>
                        </>
                    ) : (
                        errorMessage
                    )}
                </div>
            ) : null}
        </div>
    );
};
