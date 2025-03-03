# Public Address Utility

A command-line utility for generating valid cryptocurrency addresses across multiple chains, for testing, development, and documentation purposes.

## Overview

This utility generates cryptographically valid addresses for various cryptocurrency networks. It supports:

- Ethereum-style addresses (ETH, ETC, ERC-20 tokens)
- Bitcoin-style addresses (BTC, BCH, LTC, DASH) with multiple formats
- Stellar addresses (XLM and Stellar-based tokens)
- Filecoin addresses (FIL)
- Ripple addresses (XRP)

Output is structured JSON:

- top-level object with a key for currency ticker symbol
  - currency-level object with a key for each included network
  - either:
    - an array of valid public addresses (for currencies such as ETH that have only one format for all contingencies)
    - network-level object with keys for each address variant type for currencies where that is applicable (e.g., Legacy/SegWit/Native SegWit for BTC; Legacy/CashAddr for BCH, etc.)
      - an array of valid public addresses

## Installation

Clone the repository and install dependencies:

    git clone [repository-url]
    cd public-address-util
    yarn install

This tool has been built against Node v22.14.0 (`lts/jod`), but seems to work acceptably well at least as far back as v18.20.4 (`hydrogen`)

## Usage

The tool can be invoked using either:

    node index.js [options]

… from within the repository directory or, for a slightly friendlier experience:

    node public_address_util [options]

… from the parent directory.

### Options

- `-c, --currencies <currencies...>` - Currencies to generate, separated by spaces (default=all supported currencies)
- `-n, --networks <networks...>` - Networks to generate, separated by spaces (mainnet/testnet/devnet; default=all networks)
- `-s, --size <number>` - Number of addresses to generate per currency/network (default: 1)

### Supported Currencies

- Bitcoin family: btc, bch, ltc, dash
- Ethereum family: eth, etc, eigen, eurs, lseth
- Stablecoins: pax, paxg, usdc, usdt
- Regional tokens: qcad, vcad (and their Stellar variants: qcad_xl, vcad_xl)
- Other chains: fil, xlm, xrp

### Examples

Generate one address for each currency on all networks:

    node public_address_util

Generate 5 ETH and BTC addresses on mainnet only:

    node public_address_util -c eth btc -n mainnet -s 5

Generate XRP addresses on testnet only:

    node public_address_util -c xrp -n testnet

Generate 3 addresses each for ETH, BTC, and XRP for mainnet and testnet:

    node public_address_util -c eth btc xrp -n mainnet testnet -s 3

## Notes

- Some networks may not support all address types
- Private keys and other details are generated, but not currently included the output or saved

## License

ISC
