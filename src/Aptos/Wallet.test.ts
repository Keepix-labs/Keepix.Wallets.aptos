import { Wallet } from './Wallet'

describe('basic wallet', () => {
  const mnemonic =
    'weather ski ignore weird renew shrug once horror exhibit clarify muscle honey'
  const privateKey =
    '0x6c3ddd0897562fff871827cc3a0cbebf471a17a1fd53abe04ad9899b48072468'
  const address =
    '0x45e9806b95c08601e60ebede8c8ea624f150796c427aeeb1110a3e68b7eac5ba'

  it('can generate same wallet', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toEqual(mnemonic)
  })

  it('can generate with Mnemonic', async () => {
    const wallet = new Wallet({
      mnemonic: mnemonic,
      type: 'aptos',
      networkId: 'testnet',
    })

    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toEqual(mnemonic)
  })

  it('can generate with PrivateKey', async () => {
    const wallet = new Wallet({
      privateKey: privateKey,
      type: 'aptos',
      networkId: 'testnet',
    })

    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toBe(undefined)
  })

  it('can generate with random', async () => {
    const wallet = new Wallet({ type: 'aptos', networkId: 'testnet' })

    expect(wallet.getAddress()).toBeDefined()
    expect(wallet.getPrivateKey()).toBeDefined()
    expect(wallet.getMnemonic()).toBeDefined()
  })

  it('can getTokenInformation', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    expect(
      await wallet.getTokenInformation(
        '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT',
      ),
    ).toEqual({ name: 'Tether', symbol: 'USDT', decimals: 6 })
  })

  it('can getBalance', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    expect(
      await wallet.getCoinBalance(
        '0x9caab68aabb788640f98f94b32d25455f68c52bd59862629291b908b00ad776c',
      ),
    ).toEqual('0.5')
  })

  it('can getTokenBalance', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    expect(
      await wallet.getTokenBalance(
        '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT',
      ),
    ).toEqual('132.113751')
  })

  it('can estimate sendCoin', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    const estimationResult = await wallet.estimateCostSendCoinTo(
      '0x9caab68aabb788640f98f94b32d25455f68c52bd59862629291b908b00ad776c',
      '1000',
    )
    expect(estimationResult.success).toBe(false)
    // expect(estimationResult.description).toMatch('insufficient funds')
  })

  it('can estimate sendToken', async () => {
    const wallet = new Wallet({
      password: 'toto',
      type: 'aptos',
      networkId: 'testnet',
    })
    const estimationResult = await wallet.estimateCostSendTokenTo(
      '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT',
      '0x9caab68aabb788640f98f94b32d25455f68c52bd59862629291b908b00ad776c',
      '10',
    )
    expect(estimationResult.success).toBe(true)
  })
})
