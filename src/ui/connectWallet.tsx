import React from "react";
import { WalletPickerModal } from "@renproject/multiwallet-ui";
import { RenNetwork } from "@renproject/interfaces";

import { multiwalletOptions } from "../lib/multiwallet";

interface Props {
    chain: string | null;
    close: () => void;
}

export const ConnectWallet: React.FC<Props> = ({ chain, close }) => {
    return (
        <WalletPickerModal
            open={chain !== null}
            options={{
                targetNetwork: RenNetwork.Mainnet,
                chain: chain || "",
                onClose: close,
                config: multiwalletOptions,
            }}
        />
    );
};
