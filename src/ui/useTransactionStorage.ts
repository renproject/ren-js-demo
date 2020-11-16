import React from "react";
import { OrderedMap } from "immutable";
import { LockAndMintDeposit } from "@renproject/ren/build/main/lockAndMint";
import { BurnAndRelease } from "@renproject/ren/build/main/burnAndRelease";
import { TxStatus } from "@renproject/interfaces";

import { Asset } from "../lib/chains";
import { BurnStatus, DepositStatus } from "../lib/mint";

export interface DepositDetails {
    type: "MINT";
    deposit: LockAndMintDeposit;
    status: DepositStatus;
}

export interface BurnDetails {
    type: "BURN";
    burn: BurnAndRelease;
    status: BurnStatus;
    confirmations: number;
    targetConfs: number | undefined;
    renVMStatus: TxStatus | undefined;
}

export const useTransactionStorage = (
    updateBalance: (asset: Asset) => void
) => {
    const [deposits, setDeposits] = React.useState(
        OrderedMap<string, DepositDetails | BurnDetails>()
    );

    const addDeposit = React.useCallback(
        (txHash: string, deposit: LockAndMintDeposit) => {
            setDeposits((deposits) =>
                deposits.get(txHash)
                    ? deposits
                    : deposits.set(txHash, {
                          type: "MINT",
                          deposit: deposit,
                          status: DepositStatus.DETECTED,
                      })
            );
        },
        [setDeposits]
    );

    const addBurn = React.useCallback(
        (txHash: string, burn: BurnAndRelease) => {
            setDeposits((deposits) =>
                deposits.get(txHash)
                    ? deposits
                    : deposits.set(txHash, {
                          type: "BURN",
                          burn: burn,
                          status: BurnStatus.BURNT,
                          confirmations: 0,
                          targetConfs: undefined,
                          renVMStatus: undefined,
                      })
            );
        },
        [setDeposits]
    );

    const updateTransaction = React.useCallback(
        (txHash: string, newDetails: Partial<DepositDetails | BurnDetails>) => {
            setDeposits((deposits) => {
                const currentDeposit = deposits.get(txHash);
                if (!currentDeposit) {
                    return deposits;
                }
                if (currentDeposit.type === "MINT") {
                    if (newDetails.status === DepositStatus.DONE) {
                        updateBalance(
                            currentDeposit.deposit.params.asset as Asset
                        );
                    }
                    return deposits.set(txHash, {
                        ...currentDeposit,
                        ...newDetails,
                    } as DepositDetails);
                } else {
                    if (newDetails.status === BurnStatus.BURNT) {
                        updateBalance(
                            currentDeposit.burn.params.asset as Asset
                        );
                    }
                    return deposits.set(txHash, {
                        ...currentDeposit,
                        ...newDetails,
                    } as BurnDetails);
                }
            });
        },
        [setDeposits, updateBalance]
    );

    return { deposits, addDeposit, addBurn, updateTransaction };
};
