import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

import { usesBitcoinAddress, generateBitcoinTokenSet, bitcoinSetMapper } from './currencies/bitcoin.js';
import { usesEthAddress, generateEthToken } from './currencies/ethereum.js';
import { usesStellarAddress, generateStellarTokenSet } from './currencies/stellar.js';
import { usesFilecoinAddress, generateFilecoinToken } from './currencies/filecoin.js';
import { usesRippleAddress, generateRippleToken } from './currencies/ripple.js';

const SUPPORTED_CURRENCIES = [
  "bch", "btc",
  "dash",
  "eigen", "etc", "eth", "eurs",
  "fil",
  "lseth", "ltc",
  "pax", "paxg",
  "qcad", "qcad_xlm",
  "usdc", "usdc_xlm", "usdt",
  "vcad", "vcad_xlm",
  "xlm", "xrp"
]

function setupCommandLine() {
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
        .option('-o, --output <file>',
            'output file path (default: addresses.json)',
            'addresses.json')
        .addHelpText('after', `
Examples:
  # Generate one address for each currency on all networks
  $ address-generator

  # Generate 5 ETH and BTC addresses on mainnet only
  $ address-generator -c eth btc -n mainnet -s 5

  # Generate XRP addresses on testnet only and save to custom file
  $ address-generator -c xrp -n testnet -o xrp_addresses.json

  # Generate multiple addresses for specific networks
  $ address-generator -c eth btc xrp -n mainnet testnet -s 3

Notes:
  - Bitcoin-style addresses (BTC, LTC, BCH, DASH) will generate multiple formats where supported
  - Some networks may not support all address types
  - Private keys are not saved, make sure to store them securely`);

    program.parse();
    
    const options = program.opts();
    return {
        currencies: options.currencies,
        networks: options.networks,
        size: parseInt(options.size),
        output: options.output
    };
}

async function exportToFile(data, filePath) {
    try {
        // Ensure the directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write the data to file
        await fs.writeFile(
            filePath,
            JSON.stringify(data, null, 2),
            'utf8'
        );
        
        console.log(chalk.green(`✓ Successfully exported addresses to ${filePath}`));
    } catch (error) {
        console.error(chalk.red(`Error writing to file: ${error.message}`));
        process.exit(1);
    }
}

// Main program
const { currencies: currencyList, networks: networkList, size: listSize, output: outputFile } = setupCommandLine();

let addressMap = new Map();

for (let currency of currencyList) {
    let addressSet = {};
    const generator = usesEthAddress(currency) ? generateEthToken 
        : usesBitcoinAddress(currency) ? generateBitcoinTokenSet 
        : usesStellarAddress(currency) ? generateStellarTokenSet 
        : usesFilecoinAddress(currency) ? generateFilecoinToken 
        : usesRippleAddress(currency) ? generateRippleToken 
        : null;
    
    const mapper = usesBitcoinAddress(currency) ? bitcoinSetMapper : null;
    
    if (generator) {
        for (let network of networkList) {
            const addresses = [];
            for (let i = 0; i < listSize; i++) {
                const token = await generator(currency, network);
                addresses.push(token.address !== undefined ? token.address : token);
            }
            addressSet[network] = addresses;
        }
        if(mapper) {
            addressSet = mapper(addressSet);
        }
        addressMap.set(currency, addressSet);
    } else {
        console.log(chalk.yellow(`⚠ ${currency} address type not yet implemented`));
    }
}

// Export the generated addresses
await exportToFile(
    Object.fromEntries(addressMap),
    outputFile
);
