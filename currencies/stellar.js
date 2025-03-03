import StellarSdk from 'stellar-sdk';

export function usesStellarAddress(currency) {
    return currency.toLowerCase() === 'xlm' || currency.toLowerCase().endsWith('_xlm');
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

export async function generateStellarTokenSet(currency = 'xlm', network = 'mainnet') {
    // Stellar addresses are uniform across all variants
    const token = await generateStellarToken(currency, network);
    return token.address;
} 