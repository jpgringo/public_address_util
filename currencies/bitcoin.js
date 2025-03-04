import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cashaddr = require('cashaddrjs');

import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

export function usesBitcoinAddress(currency) {
    const bitcoinStyleCurrencies = [
        'btc',
        'bch',
        'ltc',
        'dash'
    ];
    return bitcoinStyleCurrencies.includes(currency.toLowerCase());
}

function getBitcoinNetwork(currency, network) {
    switch (currency.toLowerCase()) {
        case 'bch':
            // Bitcoin Cash network parameters
            const bchNetwork = {
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
                return {
                    ...bchNetwork,
                    pubKeyHash: 0x6f,
                    scriptHash: 0xc4,
                    wif: 0xef
                };
            }
            return bchNetwork;

        case 'ltc':
            if (network === 'testnet') {
                return bitcoin.networks.testnet;
            }
            // Litecoin mainnet parameters
            return {
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

        case 'dash':
            const dashNetwork = {
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
                return {
                    ...dashNetwork,
                    pubKeyHash: 0x8c, // Testnet starts with 'y'
                    scriptHash: 0x13,
                    wif: 0xef
                };
            }
            return dashNetwork;

        case 'btc':
        default:
            return network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    }
}

async function generateBitcoinToken(currency = 'btc', network = 'mainnet', addressType = 'native-segwit') {
    const bitcoinNetwork = getBitcoinNetwork(currency, network);

    // Handle address type compatibility
    if (currency.toLowerCase() === 'dash' && addressType === 'native-segwit') {
        addressType = 'legacy'; // Fall back to legacy for DASH
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

export async function generateBitcoinTokenSet(currency = 'btc', network = 'mainnet') {
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

export function bitcoinSetMapper(addressSet) {
    const collatedAddressSet = {};
    for (let [network, addresses] of Object.entries(addressSet)) {
        const collatedAddresses = {};
        for(let tokenSet of addresses) {
            for(let [tokenType, address] of Object.entries(tokenSet)) {
                if(!collatedAddresses[tokenType]) {
                    collatedAddresses[tokenType] = [address];
                } else {
                    collatedAddresses[tokenType].push(address);
                }
            }
        }
        collatedAddressSet[network] = collatedAddresses;
    }
    return collatedAddressSet;
} 