export enum Chain {
    Ethereum = "Ethereum",
    BSC = "BSC",
}

export const Chains = new Map<Chain, { symbol: Chain; name: string }>()
    .set(Chain.Ethereum, {
        symbol: Chain.Ethereum,
        name: "Ethereum",
    })
    .set(Chain.BSC, {
        symbol: Chain.BSC,
        name: "Binance Smart Chain",
    });
export const defaultMintChain = Chain.Ethereum;

export enum Asset {
    FIL = "FIL",
    BTC = "BTC",
}
export const Assets = new Map<Asset, { symbol: Asset; name: string }>()
    .set(Asset.FIL, {
        symbol: Asset.FIL,
        name: "Filecoin",
    })
    .set(Asset.BTC, {
        symbol: Asset.BTC,
        name: "Bitcoin",
    });
export const defaultAsset = Asset.FIL;
