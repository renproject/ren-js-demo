import {
    getRenNetworkDetails,
    RenNetwork,
    RenNetworkDetails,
} from "@renproject/interfaces";
import { Chain } from "./lib/chains";

export const NETWORK: RenNetworkDetails = getRenNetworkDetails(
    RenNetwork.TestnetVDot3
);

export const getNetwork = (chain: Chain, token: string, isTestnet: boolean) => {
    const legacy =
        (token === "BTC" || token === "ZEC" || token === "BCH") &&
        chain === Chain.Ethereum;

    return NETWORK.isTestnet
        ? legacy
            ? RenNetwork.Testnet
            : RenNetwork.TestnetVDot3
        : legacy
        ? RenNetwork.Mainnet
        : RenNetwork.MainnetVDot3;
};
