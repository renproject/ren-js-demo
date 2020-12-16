import React from "react";
import { WalletPickerModal } from "@renproject/multiwallet-ui";
import { RenNetwork } from "@renproject/interfaces";

import { multiwalletOptions } from "../lib/multiwallet";
import { NETWORK } from "../network";

interface Props {
    chain: string | null;
    close: () => void;
}

export const ConnectWallet: React.FC<Props> = ({ chain, close }) => {
    return (
        <WalletPickerModal
            open={chain !== null}
            options={{
                targetNetwork: NETWORK.isTestnet
                    ? RenNetwork.Testnet
                    : RenNetwork.Mainnet,
                chain: chain || "",
                onClose: close,
                config: multiwalletOptions,
            }}
        />
    );
};
