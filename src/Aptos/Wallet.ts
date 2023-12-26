import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  SigningSchemeInput,
} from '@aptos-labs/ts-sdk'
import { generateMnemonic, entropyToMnemonic } from 'bip39-light'

type NETWORK = 'mainnet' | 'testnet' | 'devnet'

const DERIVATION_PATH = "m/44'/637'/0'/0'/0"

function createPrivateKey(templatePrivateKey: string, password: string) {
  const crypto = require('crypto')
  const hash = crypto
    .createHash('sha256')
    .update(templatePrivateKey + password, 'utf8')
    .digest('hex')
  return hash.substring(0, 32) // Truncate to 64 characters (32 bytes)
}

function formatUnits(value: number, decimals: number) {
  let display = value.toString()

  const negative = display.startsWith('-')
  if (negative) display = display.slice(1)

  display = display.padStart(decimals, '0')

  let [integer, fraction] = [
    display.slice(0, display.length - decimals),
    display.slice(display.length - decimals),
  ]
  fraction = fraction.replace(/(0+)$/, '')
  return `${negative ? '-' : ''}${integer || '0'}${
    fraction ? `.${fraction}` : ''
  }`
}

function parseUnits(value: string, decimals: number) {
  let [integer, fraction = '0'] = value.split('.')

  const negative = integer.startsWith('-')
  if (negative) integer = integer.slice(1)

  // trim leading zeros.
  fraction = fraction.replace(/(0+)$/, '')

  // round off if the fraction is larger than the number of decimals.
  if (decimals === 0) {
    if (Math.round(Number(`.${fraction}`)) === 1)
      integer = `${BigInt(integer) + 1n}`
    fraction = ''
  } else if (fraction.length > decimals) {
    const [left, unit, right] = [
      fraction.slice(0, decimals - 1),
      fraction.slice(decimals - 1, decimals),
      fraction.slice(decimals),
    ]

    const rounded = Math.round(Number(`${unit}.${right}`))
    if (rounded > 9)
      fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, '0')
    else fraction = `${left}${rounded}`

    if (fraction.length > decimals) {
      fraction = fraction.slice(1)
      integer = `${BigInt(integer) + 1n}`
    }

    fraction = fraction.slice(0, decimals)
  } else {
    fraction = fraction.padEnd(decimals, '0')
  }

  return BigInt(`${negative ? '-' : ''}${integer}${fraction}`)
}

/**
 * Wallet class who respect the WalletLibraryInterface for Keepix
 */
export class Wallet {
  private networkId: NETWORK
  private wallet: Account
  private mnemonic?: string
  private type: string
  private keepixTokens?: { coins: any; tokens: any }
  private rpc?: any
  private provider: Aptos

  constructor({
    networkId,
    password,
    mnemonic,
    privateKey,
    type,
    keepixTokens,
    rpc,
    privateKeyTemplate = '0x414693f6eac56f81a02d071a640a0fc1692e86a26cbc52d03553775b3012d706',
  }: {
    networkId: NETWORK
    password?: string
    mnemonic?: string
    privateKey?: string
    type: string
    keepixTokens?: { coins: any; tokens: any } // whitelisted coins & tokens
    rpc?: any
    privateKeyTemplate?: string
  }) {
    this.type = type
    this.keepixTokens = keepixTokens
    this.rpc = rpc
    this.networkId = networkId

    const aptosConfig = new AptosConfig({
      network:
        this.networkId === 'mainnet'
          ? Network.MAINNET
          : this.networkId === 'devnet'
            ? Network.DEVNET
            : Network.TESTNET,
    })
    this.provider = new Aptos(aptosConfig)

    // from password
    if (password !== undefined) {
      const newPrivateKey = createPrivateKey(privateKeyTemplate, password)
      this.mnemonic = entropyToMnemonic(newPrivateKey)
      this.wallet = Account.fromDerivationPath({
        path: DERIVATION_PATH,
        mnemonic: this.mnemonic,
        scheme: SigningSchemeInput.Ed25519,
      })
      return
    }

    // from mnemonic
    if (mnemonic !== undefined) {
      this.mnemonic = mnemonic
      this.wallet = Account.fromDerivationPath({
        path: DERIVATION_PATH,
        mnemonic,
        scheme: SigningSchemeInput.Ed25519,
      })
      return
    }
    // from privateKey only
    if (privateKey !== undefined) {
      this.mnemonic = undefined
      this.wallet = Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
      })
      return
    }
    // Random
    this.mnemonic = generateMnemonic()
    this.wallet = Account.fromDerivationPath({
      path: DERIVATION_PATH,
      mnemonic: this.mnemonic,
      scheme: SigningSchemeInput.Ed25519,
    })
  }

  // PUBLIC

  public getPrivateKey() {
    return this.wallet.privateKey.toString()
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public getAddress() {
    return this.wallet.accountAddress.toString()
  }

  public async getProdiver() {
    return this.provider
  }

  public getConnectedWallet = async () => {
    return this.wallet
  }

  public async getTokenInformation(tokenAddress: string) {
    try {
      const metadata =
        await this.provider.fungibleAsset.getFungibleAssetMetadataByAssetType({
          assetType: tokenAddress,
        })

      return {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
      }
    } catch (err) {
      console.log(err)
      return undefined
    }
  }

  // always display the balance in 0 decimals like 1.01 APT
  public async getCoinBalance(walletAddress?: string) {
    try {
      const balance = await this.provider.getAccountAPTAmount({
        accountAddress: walletAddress ?? this.wallet.accountAddress.toString(),
      })
      return formatUnits(balance, 8)
    } catch (err) {
      console.log(err)
      return '0'
    }
  }

  // always display the balance in 0 decimals like 1.01 RPL
  public async getTokenBalance(tokenAddress: string, walletAddress?: string) {
    try {
      const metadata =
        await this.provider.fungibleAsset.getFungibleAssetMetadataByAssetType({
          assetType: tokenAddress,
        })
      const balance = await this.provider.getAccountCoinAmount({
        accountAddress: walletAddress ?? this.wallet.accountAddress.toString(),
        coinType: tokenAddress as any,
      })
      return formatUnits(balance, metadata.decimals)
    } catch (err) {
      console.log(err)
    }
  }

  public async estimateCostOfTx(tx: any) {
    const estimation = (
      await this.provider.simulate.transaction({
        signerPublicKey: this.wallet.publicKey,
        transaction: tx,
      })
    )[0]

    if (estimation.success) return { success: true, description: estimation }
    else
      return {
        success: false,
        description: `Estimation Failed: ${estimation.vm_status}`,
      }
  }

  public async estimateCostSendCoinTo(receiverAddress: string, amount: string) {
    const transaction = await this.provider.transferCoinTransaction({
      sender: this.wallet,
      amount: parseUnits(amount, 8),
      recipient: receiverAddress,
    })

    return this.estimateCostOfTx(transaction)
  }

  public async sendCoinTo(receiverAddress: string, amount: string) {
    try {
      const transaction = await this.provider.transferCoinTransaction({
        sender: this.wallet,
        amount: parseUnits(amount, 8),
        recipient: receiverAddress,
      })

      const pendingTx = await this.provider.signAndSubmitTransaction({
        signer: this.wallet,
        transaction,
      })

      return { success: true, description: pendingTx.hash }
    } catch (err) {
      console.log(err)
      return { success: false, description: `Transaction Failed: ${err}` }
    }
  }

  public async sendTokenTo(
    tokenAddress: string,
    receiverAddress: string,
    amount: string,
  ) {
    try {
      const metadata =
        await this.provider.fungibleAsset.getFungibleAssetMetadataByAssetType({
          assetType: tokenAddress,
        })

      const transaction = await this.provider.transferCoinTransaction({
        amount: parseUnits(amount, metadata.decimals),
        recipient: AccountAddress.fromString(receiverAddress),
        coinType: tokenAddress as any,
        sender: this.wallet,
      })

      const pendingTx = await this.provider.signAndSubmitTransaction({
        signer: this.wallet,
        transaction,
      })

      return { success: true, description: pendingTx.hash }
    } catch (err) {
      console.log(err)
      return { success: false, description: `Transfer Failed: ${err}` }
    }
  }

  public async estimateCostSendTokenTo(
    tokenAddress: string,
    receiverAddress: string,
    amount: string,
  ) {
    const metadata =
      await this.provider.fungibleAsset.getFungibleAssetMetadataByAssetType({
        assetType: tokenAddress,
      })

    const transaction = await this.provider.transferCoinTransaction({
      amount: parseUnits(amount, metadata.decimals),
      recipient: AccountAddress.fromString(receiverAddress),
      coinType: tokenAddress as any,
      sender: this.wallet,
    })

    return this.estimateCostOfTx(transaction)
  }
}
