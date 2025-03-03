import {ethers} from 'ethers';

export function usesEthAddress(currency) {
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

export async function generateEthToken(currency = 'eth', network = 'mainnet') {
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