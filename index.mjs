import { Buffer } from 'buffer';
import CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { mnemonicToEntropy } from 'bip39';

function harden(num) {
    return 0x80000000 + num;
}

export function restoreAccount(mnemonic, derivationPath) {
    const dPath = derivationPath.replace(/[^0-9.]+/g, '/').split('/').filter(item => item !== '');
    const entropy = mnemonicToEntropy(mnemonic);

    // See here: https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-keys.md
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
        Buffer.from(entropy, 'hex'),
        Buffer.from(''), // No password
    );

    const accountKey = rootKey
        .derive(harden(dPath[0])) // purpose (1852 if following https://cips.cardano.org/cips/cip1852/)
        .derive(harden(dPath[1])) // coin type (1815)
        .derive(harden(dPath[2])); // account #0

    const utxoPubKey = accountKey
        .derive(parseInt(dPath[3])) // external (0)
        .derive(parseInt(dPath[4])) // (0)
        .to_public();

    const stakeKey = accountKey
        .derive(2) // chimeric
        .derive(0)
        .to_public();

    // base address with staking key
    const baseAddr = CardanoWasm.BaseAddress.new(
        CardanoWasm.NetworkInfo.mainnet().network_id(),
        CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
        CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
    );

    // enterprise address without staking ability, for use by exchanges/etc
    const enterpriseAddr = CardanoWasm.EnterpriseAddress.new(
        CardanoWasm.NetworkInfo.mainnet().network_id(),
        CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash())
    );

    return {
        baseAddr: baseAddr.to_address().to_bech32(),
        entAddr: enterpriseAddr.to_address().to_bech32(),
        mnemonic,
        derivationPath,
        rootKey: {
            bech32: rootKey.to_bech32(),
            hex: Buffer.from(rootKey.as_bytes()).toString("hex")
        },
        accountKey: {
            bech32: accountKey.to_bech32(),
            hex: Buffer.from(accountKey.as_bytes()).toString("hex")
        },
        stakeKey: {
            bech32: stakeKey.to_bech32(),
            hex: Buffer.from(stakeKey.as_bytes()).toString("hex")
        },
        extendedPublicKey: {
            bech32: utxoPubKey.to_bech32(),
            hex: Buffer.from(utxoPubKey.as_bytes()).toString("hex")
        }
    };
}

const mnenomic = 'pass code until divert ship shuffle dawn power pattern crumble false improve';
const derivationPath = `m/44'/1815'/0'/0/0`

console.log(restoreAccount(mnenomic, derivationPath))