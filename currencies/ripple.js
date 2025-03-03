import { Wallet } from 'xrpl';

export function usesRippleAddress(currency) {
    return currency.toLowerCase() === 'xrp';
}

export async function generateRippleToken(currency = 'xrp', network = 'mainnet') {
    // Generate a new wallet with a random seed
    const wallet = Wallet.generate();

    return {
        address: wallet.address,
        privateKey: wallet.seed,  // XRP uses a "seed" as private key
        network,
        type: 'ripple'
    };
} 