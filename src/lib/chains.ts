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
    BTC = "BTC",
    ZEC = "ZEC",
    BCH = "BCH",
    FIL = "FIL",
    LUNA = "LUNA",
    DOGE = "DOGE",
}
export let Assets = new Map<Asset, { symbol: Asset; name: string }>()
    .set(Asset.BTC, {
        symbol: Asset.BTC,
        name: "Bitcoin",
    })
    .set(Asset.ZEC, {
        symbol: Asset.ZEC,
        name: "Zcash",
    })
    .set(Asset.BCH, {
        symbol: Asset.BCH,
        name: "BitcoinCash",
    })
    .set(Asset.FIL, {
        symbol: Asset.FIL,
        name: "Filecoin",
    })
    .set(Asset.LUNA, {
        symbol: Asset.LUNA,
        name: "Luna",
    })
    .set(Asset.DOGE, {
        symbol: Asset.DOGE,
        name: "Dogecoin",
    });

export const defaultAsset = Asset.FIL;
