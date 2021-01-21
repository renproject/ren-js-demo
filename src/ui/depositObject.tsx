import * as React from "react";

import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import BigNumber from "bignumber.js";
import { Loading } from "@renproject/react-components";
import { TxStatus } from "@renproject/interfaces";

import { DepositStatus, handleDeposit, submitDeposit } from "../lib/mint";
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
    deposit: LockAndMintDeposit;
    status: DepositStatus;
    updateTransaction: (
        txHash: string,
        transaction: Partial<BurnDetails> | Partial<DepositDetails>
    ) => void;
}

export const DepositObject: React.FC<Props> = ({
    txHash,
    deposit,
    status,
    updateTransaction,
}) => {
    const { asset, from, to } = deposit.params;
    const { amount } = deposit.depositDetails;

    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [showingFullError, setShowingFullError] = React.useState(false);
    const showFullError = React.useCallback(() => setShowingFullError(true), [
        setShowingFullError,
    ]);

    const [amountReadable, setAmountReadable] = React.useState<string | null>(
        null
    );

    const onStatus = React.useCallback(
        (newStatus: DepositStatus) => {
            console.log("Step: handling status", newStatus);
            updateTransaction(txHash, { status: newStatus });
        },
        [updateTransaction, txHash]
    );

    // Confirmations
    const [confirmations, setConfirmations] = React.useState<number | null>(
        null
    );
    const [targetConfirmations, setTargetConfirmations] = React.useState<
        number | null
    >(null);
    const onConfirmation = React.useCallback(
        (confs: number, target: number) => {
            console.log("Step: handle confirmation", confs, target);
            setConfirmations(confs);
            setTargetConfirmations(target);
        },
        []
    );

    // The RenVM Status - see the TxStatus type.
    const [renVMStatus, setRenVMStatus] = React.useState<TxStatus | null>(null);

    const [mintTransaction, setMintTransaction] = React.useState<string | null>(
        null
    );

    const step1 = React.useCallback(() => {
        onStatus(DepositStatus.DETECTED);
        console.log("Step: calling handleDeposit");
        handleDeposit(
            deposit,
            onStatus,
            onConfirmation,
            setRenVMStatus,
            setMintTransaction
        ).catch((error) => {
            console.error(error);
            setErrorMessage(String(error.message || error));
            onStatus(DepositStatus.ERROR);
        });
    }, [
        onConfirmation,
        setErrorMessage,
        onStatus,
        deposit,
        setRenVMStatus,
        setMintTransaction,
    ]);

    React.useEffect(() => {
        (async () => {
            console.log("Step: inside useEffect");
            step1();

            const decimals = await from.assetDecimals(asset);
            setAmountReadable(
                new BigNumber(amount)
                    .div(new BigNumber(10).exponentiatedBy(decimals))
                    .toFixed()
            );
        })().catch(console.error);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [submitting, setSubmitting] = React.useState(false);
    const step2 = React.useCallback(async () => {
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await submitDeposit(deposit, onStatus, setMintTransaction);
        } catch (error) {
            console.error(error);
            setErrorMessage(String(error.message || error));
        }
        setSubmitting(false);
    }, [setSubmitting, deposit, onStatus]);

    return (
        <div
            className={`deposit ${status === DepositStatus.DONE ? "done" : ""}`}
        >
            <p>
                <b>
                    Received{" "}
                    {amountReadable ? (
                        amountReadable
                    ) : (
                        <Loading style={{ display: "inline-block" }} />
                    )}{" "}
                    {asset}
                </b>
            </p>
            <p>
                <b>RenVM Hash:</b> {txHash}
            </p>

            <p>
                <b>Status:</b>{" "}
                {status === DepositStatus.CONFIRMED ? (
                    <>
                        Submitting to RenVM...{" "}
                        <Loading style={{ display: "inline-block" }} />
                    </>
                ) : (
                    status
                )}
            </p>
            {deposit.depositDetails.transaction ? (
                <p>
                    <b>{from.name} tx:</b>{" "}
                    {(from as any).utils.transactionExplorerLink ? (
                        <ExternalLink
                            href={(from as any).utils.transactionExplorerLink(
                                deposit.depositDetails.transaction
                            )}
                        >
                            {from.transactionID(
                                deposit.depositDetails.transaction
                            )}
                        </ExternalLink>
                    ) : typeof deposit.depositDetails.transaction ===
                      "string" ? (
                        deposit.depositDetails.transaction
                    ) : (
                        JSON.stringify(deposit.depositDetails.transaction)
                    )}
                </p>
            ) : null}
            {mintTransaction ? (
                <p>
                    <b>{to.name} tx:</b>{" "}
                    {(to as any).utils.transactionExplorerLink ? (
                        <ExternalLink
                            href={(to as any).utils.transactionExplorerLink(
                                mintTransaction
                            )}
                        >
                            {mintTransaction}
                        </ExternalLink>
                    ) : typeof mintTransaction === "string" ? (
                        mintTransaction
                    ) : (
                        JSON.stringify(mintTransaction)
                    )}
                </p>
            ) : null}
            {status === DepositStatus.CONFIRMED && renVMStatus ? (
                <p>
                    <b>RenVM status:</b> {renVMStatus}
                </p>
            ) : null}
            {status === DepositStatus.DETECTED && confirmations !== null ? (
                <p>
                    <b>Confirmations:</b> {confirmations}/{targetConfirmations}
                </p>
            ) : null}
            {status === DepositStatus.SIGNED ? (
                <button
                    disabled={submitting}
                    onClick={step2}
                    className="button blue"
                >
                    {submitting ? <Loading /> : <>Submit to {to.name}</>}
                </button>
            ) : null}
            {status === DepositStatus.ERROR ? (
                <button
                    disabled={submitting}
                    onClick={step1}
                    className="button blue"
                >
                    Retry
                </button>
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
