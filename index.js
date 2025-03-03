import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cashaddr = require('cashaddrjs');

import {ethers} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import StellarSdk from 'stellar-sdk';
import blake2b from 'blake2b';
import base32Encode from 'base32-encode';
import { Wallet } from 'xrpl';
import { Command } from 'commander';
import chalk from 'chalk';

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

function usesFilecoinAddress(currency) {
    return currency.toLowerCase() === 'fil';
}

function usesRippleAddress(currency) {
    return currency.toLowerCase() === 'xrp';
}

const program = new Command();

program
    .name('address-generator')
    .description('Generate cryptocurrency addresses for various chains')
    .version('0.0.0')
    .option('-c, --currencies <currencies...>',
        'currencies to generate (comma or space separated)\n' +
        'supported: ' + SUPPORTED_CURRENCIES.join(', '),
        SUPPORTED_CURRENCIES)
    .option('-n, --networks <networks...>',
        'networks to generate (comma or space separated)\n' +
        'options: mainnet, testnet, devnet',
        ['mainnet', 'testnet', 'devnet'])
    .option('-s, --size <number>',
        'number of addresses to generate per currency/network',
        '1')
    .addHelpText('after', `
Examples:
  # Generate one address for each currency on all networks
  $ address-generator

  # Generate 5 ETH and BTC addresses on mainnet only
  $ address-generator -c eth btc -n mainnet -s 5

  # Generate XRP addresses on testnet only
  $ address-generator -c xrp -n testnet

  # Generate multiple addresses for specific networks
  $ address-generator -c eth btc xrp -n mainnet testnet -s 3

Notes:
  - Bitcoin-style addresses (BTC, LTC, BCH, DASH) will generate multiple formats where supported
  - Some networks may not support all address types
  - Private keys are not saved, make sure to store them securely`);

program.parse();

const options = program.opts();

// Replace our hardcoded values with command line options
let currencyList = options.currencies;
let listSize = parseInt(options.size);

// Use the networks option directly
const networkList = options.networks;

let addressMap = new Map()

for (let currency of currencyList) {
  let addressSet = {}
  const generator = usesEthAddress(currency) ? generateEthToken : usesBitcoinAddress(currency) ? generateBitcoinTokenSet : usesStellarAddress(currency) ? generateStellarTokenSet : usesFilecoinAddress(currency) ? generateFilecoinToken : usesRippleAddress(currency) ? generateRippleToken : null
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

console.log(chalk.bold.green(`Generated address map:`))
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
    let bitcoinNetwork;
    switch (currency.toLowerCase()) {
        case 'bch':
            // Bitcoin Cash network parameters
            bitcoinNetwork = {
                messagePrefix: '\x18Bitcoin Signed Message:\n',
                bip32: {
                    public: 0x0488b21e,
                    private: 0x0488ade4
                },
                pubKeyHash: 0x00, // Same as BTC for legacy addresses
                scriptHash: 0x05,
                wif: 0x80
            };
            if (network === 'testnet') {
                bitcoinNetwork = {
                    ...bitcoinNetwork,
                    pubKeyHash: 0x6f,
                    scriptHash: 0xc4,
                    wif: 0xef
                };
            }
            // BCH doesn't support SegWit
            if (addressType !== 'legacy' && addressType !== 'cashaddr') {
                addressType = 'cashaddr'; // Default to CashAddr format
            }
            break;

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
                bitcoinNetwork = bitcoin.networks.testnet;
            }
            break;

        case 'dash':
            // Dash network parameters
            bitcoinNetwork = {
                messagePrefix: '\x19DarkCoin Signed Message:\n',
                bip32: {
                    public: 0x0488b21e,
                    private: 0x0488ade4
                },
                pubKeyHash: 0x4c, // Starts with 'X'
                scriptHash: 0x10, // Starts with '7'
                wif: 0xcc
            };
            if (network === 'testnet') {
                bitcoinNetwork = {
                    ...bitcoinNetwork,
                    pubKeyHash: 0x8c, // Testnet starts with 'y'
                    scriptHash: 0x13,
                    wif: 0xef
                };
            }
            // Note: DASH doesn't support native SegWit addresses
            if (addressType === 'native-segwit') {
                addressType = 'legacy'; // Fall back to legacy for DASH
            }
            break;

        case 'btc':
        default:
            bitcoinNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    }

    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.makeRandom({ network: bitcoinNetwork });

    let address;
    if (currency.toLowerCase() === 'bch' && addressType === 'cashaddr') {
        // Generate legacy address first
        const legacyAddress = bitcoin.payments.p2pkh({
            pubkey: keyPair.publicKey,
            network: bitcoinNetwork
        }).address;

        // Convert to CashAddr format
        const prefix = network === 'mainnet' ? 'bitcoincash' : 'bchtest';
        address = cashaddr.encode(prefix, 'P2PKH', bitcoin.address.fromBase58Check(legacyAddress).hash);
    } else {
        // Handle other address types as before
        switch (addressType.toLowerCase()) {
            case 'legacy':
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
    if (currency.toLowerCase() === 'bch') {
        const legacy = await generateBitcoinToken(currency, network, 'legacy');
        const cashAddr = await generateBitcoinToken(currency, network, 'cashaddr');
        return {
            legacy: legacy.address,
            cashaddr: cashAddr.address
        };
    } else if (currency.toLowerCase() === 'dash') {
        const legacy = await generateBitcoinToken(currency, network, 'legacy');
        return {
            legacy: legacy.address
        };
    }

    // For other Bitcoin-style currencies, generate all supported formats
    const legacy = await generateBitcoinToken(currency, network, 'legacy');
    const segwit = await generateBitcoinToken(currency, network, 'segwit');
    const nativeSegwit = await generateBitcoinToken(currency, network, 'native-segwit');
    return {
        legacy: legacy.address,
        segwit: segwit.address,
        native: nativeSegwit.address
    };
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
    // Create a new random keypair using Stellar SDK
    const keypair = StellarSdk.Keypair.random();

    // Stellar addresses are the same format regardless of network
    // The network setting only affects which network the address is used on
    return {
        address: keypair.publicKey(),
        privateKey: keypair.secret(),
        network,
        type: 'stellar'
    };
}

async function generateStellarTokenSet(currency = 'xlm', network = 'mainnet') {
    // Stellar addresses are uniform across all variants
    const token = await generateStellarToken(currency, network);
    return token.address;
}

async function generateFilecoinToken(currency = 'fil', network = 'mainnet') {
    // Filecoin addresses start with f1 (mainnet) or t1 (testnet) for secp256k1 addresses
    const prefix = network === 'mainnet' ? 'f1' : 't1';

    // Generate secp256k1 keypair
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.makeRandom();

    // Hash the public key with Blake2b-160
    const output = new Uint8Array(20); // 160 bits
    const hash = blake2b(output.length)
        .update(keyPair.publicKey)
        .digest();

    // Encode with base32
    const encoded = base32Encode(hash, 'RFC4648-HEX', { padding: false });

    // Combine prefix and encoded hash
    const address = `${prefix}${encoded.toLowerCase()}`;

    return {
        address,
        privateKey: keyPair.privateKey.toString('hex'),
        network,
        type: 'filecoin'
    };
}

async function generateRippleToken(currency = 'xrp', network = 'mainnet') {
    // Generate a new wallet with a random seed
    const wallet = Wallet.generate();

    return {
        address: wallet.address,
        privateKey: wallet.seed,  // XRP uses a "seed" as private key
        network,
        type: 'ripple'
    };
}
