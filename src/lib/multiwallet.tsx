import { EthereumInjectedConnector } from "@renproject/multiwallet-ethereum-injected-connector";
import { EthereumWalletConnectConnector } from "@renproject/multiwallet-ethereum-walletconnect-connector";
import { BinanceSmartChainInjectedConnector } from "@renproject/multiwallet-binancesmartchain-injected-connector";
import { WalletPickerConfig } from "@renproject/multiwallet-ui";
import { RenNetwork } from "@renproject/interfaces";

import { Chain } from "./chains";
import { Icons } from "./icons";

export const ethNetworkToRenNetwork = (id: number): string => {
    return {
        1: RenNetwork.Mainnet,
        4: RenNetwork.Testnet,
        42: RenNetwork.Testnet,
    }[parseInt(String(id))];
};

export const bscNetworkToRenNetwork = (id: number): string => {
    return {
        56: RenNetwork.Mainnet,
        97: RenNetwork.Testnet,
    }[parseInt(String(id))];
};

export const multiwalletOptions: WalletPickerConfig<any, any> = {
    chains: {
        [Chain.Ethereum]: [
            {
                name: "Metamask",
                logo: Icons.Metamask,
                connector: new EthereumInjectedConnector({
                    debug: true,
                    networkIdMapper: ethNetworkToRenNetwork as any,
                } as any),
            },
            {
                name: "WalletConnect",
                logo: Icons.WalletConnect,
                connector: new EthereumWalletConnectConnector({
                    rpc: {
                        1: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
                        3: `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`,
                        4: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
                        42: `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`,
                    },
                    qrcode: true,
                    debug: false,
                }),
            },
        ],
        [Chain.BSC]: [
            {
                name: "BinanceSmartWallet",
                logo: Icons.BSC,
                connector: new BinanceSmartChainInjectedConnector({
                    debug: true,
                    networkIdMapper: bscNetworkToRenNetwork as any,
                }),
            },
        ],
    },
};
