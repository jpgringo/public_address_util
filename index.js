import {ethers} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

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

function usesBitcoinAddress(currency) {
  const bitcoinStyleCurrencies = [
    'btc',
    'bch',
    'ltc',
    'dash'
  ];
  return bitcoinStyleCurrencies.includes(currency.toLowerCase());
}

function usesStellarAddress(currency) {
  return currency.toLowerCase() === 'xlm' || currency.toLowerCase().endsWith('_xl');
}

console.log(`this is working:`, SUPPORTED_CURRENCIES.join(", "));

// params here
let currencyList = SUPPORTED_CURRENCIES
let generateMainnet = true
let generateTestnet = true
let generateDevnet = true

let listSize = 3

const networkList = []

networkList.push(...[
  generateMainnet && 'mainnet',
  generateTestnet && 'testnet',
  generateDevnet && 'devnet'
].filter(Boolean))

let currency = currencyList[0]

console.log(`Generating ${listSize} ${currency} ${networkList.join('/')} addresses...`)

let addressMap = new Map()

for (let currency of currencyList) {
  let addressSet = {}
  const generator = usesEthAddress(currency) ? generateEthToken : usesBitcoinAddress(currency) ? generateBitcoinTokenSet : usesStellarAddress(currency) ? generateStellarToken : null
  const mapper = usesBitcoinAddress(currency) ? bitcoinSetMapper : null
  if (generator) {
    for (let network of networkList) {
      const addresses = []
      for (let i = 0; i < listSize; i++) {
        const token = await generator(currency, network)
        addresses.push(token.address !== undefined ? token.address : token)
      }
      addressSet[network] = addresses
    }
    if(mapper) {
      addressSet = mapper(addressSet)
    }
    addressMap.set(currency, addressSet)
  } else {
    console.log(`${currency} address type not yet implemented`)
  }
}

console.log(`Generated address map:`)
console.log(JSON.stringify(Object.fromEntries(addressMap), null, 2))

async function generateEthToken(currencty = 'eth', network = 'mainnet') {
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

async function generateBitcoinToken(currency = 'btc', network = 'mainnet', addressType = 'native-segwit') {
    // Select the appropriate network based on currency and network type
    let bitcoinNetwork;
    switch (currency.toLowerCase()) {
        case 'ltc':
            // Litecoin network parameters
            bitcoinNetwork = {
                messagePrefix: '\x19Litecoin Signed Message:\n',
                bech32: 'ltc',
                bip32: {
                    public: 0x019da462,
                    private: 0x019d9cfe
                },
                pubKeyHash: 0x30, // Starts with 'L'
                scriptHash: 0x32, // Starts with 'M'
                wif: 0xb0
            };
            if (network === 'testnet') {
                bitcoinNetwork = bitcoin.networks.testnet; // Litecoin testnet uses same params as Bitcoin testnet
            }
            break;
            
        case 'btc':
        default:
            bitcoinNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    }

    // Rest of the function remains the same
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.makeRandom({ network: bitcoinNetwork });
    
    let address;
    switch (addressType.toLowerCase()) {
        case 'legacy':
            // P2PKH (Legacy) address - will start with 'L' for Litecoin mainnet
            address = bitcoin.payments.p2pkh({
                pubkey: keyPair.publicKey,
                network: bitcoinNetwork
            }).address;
            break;
            
        case 'segwit':
            // P2SH-P2WPKH (SegWit) address - will start with 'M' for Litecoin mainnet
            address = bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2wpkh({
                    pubkey: keyPair.publicKey,
                    network: bitcoinNetwork
                }),
                network: bitcoinNetwork
            }).address;
            break;
            
        case 'native-segwit':
        default:
            // P2WPKH (Native SegWit/Bech32) address - will start with 'ltc1' for Litecoin mainnet
            address = bitcoin.payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: bitcoinNetwork
            }).address;
            break;
    }

    return {
        address,
        privateKey: keyPair.privateKey.toString('hex'),
        network,
        type: currency.toLowerCase(),
        addressType
    };
}

async function generateBitcoinTokenSet(currency = 'btc', network = 'mainnet') {

  const legacy = await generateBitcoinToken(currency, network, 'legacy');
  const segwit = await generateBitcoinToken(currency, network, 'segwit');
  const nativeSegwit = await generateBitcoinToken(currency, network, 'native-segwit');
  return {
        legacy: legacy.address,
        segwit: segwit.address,
        native: nativeSegwit.address}
}

function bitcoinSetMapper(addressSet) {
  const collatedAddressSet = {}
  for (let [network, addresses] of Object.entries(addressSet)) {
    const collatedAddresses = {}
    for(let tokenSet of addresses) {
      for(let [tokenType, address] of Object.entries(tokenSet)) {
        if(!collatedAddresses[tokenType]) {
          collatedAddresses[tokenType] = [address]
        } else {
          collatedAddresses[tokenType].push(address)
        }
      }
    }
    collatedAddressSet[network] = collatedAddresses
  }
  return collatedAddressSet
}

async function generateStellarToken(currency = 'xlm', network = 'mainnet') {
  // Create a new random wallet
  const wallet = ethers.Wallet.createRandom();

  // Return an object with the address and private key
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    network: network,
    type: 'stellar'
  };
}
