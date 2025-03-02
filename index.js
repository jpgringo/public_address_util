import { ethers } from 'ethers';

const SUPPORTED_CURRENCIES = [
    "bch", "btc",
    "dash",
    "eigen", "etc", "eth", "eurs",
    "fil",
    "lseth", "ltc",
    "pax", "paxg",
    "qcad", "qcad_xl",
    "usdc", "usdc_xl", "usdt",
    "vcad", "vcad_xl",
    "xlm", "xrp"
]

function usesEthAddress(currency) {
    // Currencies that use Ethereum-style addresses (0x... format)
    const ethereumStyleCurrencies = [
        // Native chain currencies
        'eth',
        'etc', // Ethereum Classic
        'eigen',
        // ERC-20 tokens
        'eurs',
        'pax',
        'paxg',
        'usdc',
        'usdt',
        'qcad',
        'vcad',
        'lseth',
        // Include non-_xl variants only
        'qcad',
        'vcad'
    ];
    return ethereumStyleCurrencies.includes(currency.toLowerCase());
}

console.log(`this is working:`, SUPPORTED_CURRENCIES.join(", "));

// params here
let currencyList = ['eth', 'btc', 'xrp']
let generateMainnet = true
let generateTestnet = true

let listSize = 10
let network = generateMainnet ? 'mainnet' : generateTestnet ? 'testnet' : 'devnet'

let currency = currencyList[0]

console.log(`Generating ${listSize} ${currency} ${network} addresses...`)

let addressMap = new Map()

for(let currency of currencyList) {
    const addressList = {}
    if(usesEthAddress(currency)) {
        const addresses = []
        for(let i = 0; i < listSize; i++) {
          const token = await generateEthToken(network)
          addresses.push(token.address)
        }
        addressList[network] = addresses
        addressMap.set(currency, addressList)
    } else {
        console.log(`${currency} uses a different address format`)
    }
}

console.log(`Generated address map:`, addressMap)

async function generateEthToken(network = 'mainnet') {
    // Create a new random wallet
    const wallet = ethers.Wallet.createRandom();

    // Return an object with the address and private key
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        network: network,
        type: 'ethereum'
    };
}
