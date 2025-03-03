import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import blake2b from 'blake2b';
import base32Encode from 'base32-encode';

export function usesFilecoinAddress(currency) {
    return currency.toLowerCase() === 'fil';
}

export async function generateFilecoinToken(currency = 'fil', network = 'mainnet') {
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