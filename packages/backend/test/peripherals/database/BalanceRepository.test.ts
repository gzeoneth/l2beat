import { AssetId, EthereumAddress, Logger, UnixTime } from '@l2beat/common'
import { expect } from 'earljs'

import { BalanceRepository } from '../../../src/peripherals/database/BalanceRepository'
import { BlockNumberRepository } from '../../../src/peripherals/database/BlockNumberRepository'
import { setupDatabaseTestSuite } from './setup'

describe(BalanceRepository.name, () => {
  const { database } = setupDatabaseTestSuite()
  const repository = new BalanceRepository(database, Logger.SILENT)

  const START_BLOCK_NUMBER = 123456n
  const MOCK_HOLDER = EthereumAddress(
    '0x011B6E24FfB0B5f5fCc564cf4183C5BBBc96D515',
  )
  const MOCK_ASSET = AssetId('dai-dai-stablecoin')
  const MOCK_BALANCE = 1000000000000000000n
  const DATA = [
    {
      blockNumber: START_BLOCK_NUMBER,
      holderAddress: MOCK_HOLDER,
      assetId: MOCK_ASSET,
      balance: MOCK_BALANCE,
    },
    {
      blockNumber: START_BLOCK_NUMBER + 1n,
      holderAddress: MOCK_HOLDER,
      assetId: MOCK_ASSET,
      balance: MOCK_BALANCE,
    },
  ]

  const START = UnixTime.fromDate(new Date('2022-05-17'))

  beforeEach(async () => {
    await repository.deleteAll()
    await repository.addOrUpdateMany(DATA)
  })

  describe(BalanceRepository.prototype.getByBlock.name, () => {
    it('known block', async () => {
      const additionalData = [
        {
          blockNumber: START_BLOCK_NUMBER,
          holderAddress: MOCK_HOLDER,
          assetId: AssetId('asset-a'),
          balance: MOCK_BALANCE,
        },
        {
          blockNumber: START_BLOCK_NUMBER,
          holderAddress: MOCK_HOLDER,
          assetId: AssetId('asset-b'),
          balance: MOCK_BALANCE,
        },
        {
          blockNumber: START_BLOCK_NUMBER,
          holderAddress: MOCK_HOLDER,
          assetId: AssetId('asset-c'),
          balance: MOCK_BALANCE,
        },
      ]
      await repository.addOrUpdateMany(additionalData)

      const result = await repository.getByBlock(START_BLOCK_NUMBER)

      expect(result).toBeAnArrayWith(DATA[0], ...additionalData)
      expect(result).toBeAnArrayOfLength(4)
    })

    it('unknown block', async () => {
      const result = await repository.getByBlock(START_BLOCK_NUMBER + 1000n)
      expect(result).toEqual([])
    })
  })

  describe(BalanceRepository.prototype.getByHolderAndAsset.name, () => {
    it('entries exist in the DB', async () => {
      const result = await repository.getByHolderAndAsset(
        MOCK_HOLDER,
        MOCK_ASSET,
      )

      expect(result).toEqual(DATA)
    })

    it('nonexisting holder', async () => {
      const nonexistingHolder = EthereumAddress(
        '0xcEe284F754E854890e311e3280b767F80797180d',
      )
      const result = await repository.getByHolderAndAsset(
        nonexistingHolder,
        MOCK_ASSET,
      )

      expect(result).toEqual([])
    })

    it('nonexisting asset', async () => {
      const nonexistingAsset = AssetId('nonexistent-token')
      const result = await repository.getByHolderAndAsset(
        MOCK_HOLDER,
        nonexistingAsset,
      )

      expect(result).toEqual([])
    })
  })

  describe(BalanceRepository.prototype.addOrUpdateMany.name, () => {
    it('new rows only', async () => {
      const newRows = [
        {
          blockNumber: START_BLOCK_NUMBER + 2n,
          holderAddress: EthereumAddress(
            '0x011B6E24FfB0B5f5fCc564cf4183C5BBBc96D515',
          ),
          assetId: AssetId('dai-dai-stablecoin'),
          balance: MOCK_BALANCE,
        },
        {
          blockNumber: START_BLOCK_NUMBER + 3n,
          holderAddress: EthereumAddress(
            '0x011B6E24FfB0B5f5fCc564cf4183C5BBBc96D515',
          ),
          assetId: AssetId('dai-dai-stablecoin'),
          balance: MOCK_BALANCE,
        },
      ]
      await repository.addOrUpdateMany(newRows)

      const result = await repository.getAll()
      expect(result).toBeAnArrayWith(...DATA, ...newRows)
      expect(result).toBeAnArrayOfLength(4)
    })

    it('existing rows only', async () => {
      const existingRows = [
        {
          blockNumber: DATA[0].blockNumber,
          holderAddress: DATA[0].holderAddress,
          assetId: DATA[0].assetId,
          balance: MOCK_BALANCE,
        },
        {
          blockNumber: DATA[1].blockNumber,
          holderAddress: DATA[1].holderAddress,
          assetId: DATA[1].assetId,
          balance: MOCK_BALANCE,
        },
      ]
      await repository.addOrUpdateMany(existingRows)

      const result = await repository.getAll()
      expect(result).toBeAnArrayWith(...existingRows)
      expect(result).toBeAnArrayOfLength(2)
    })

    it('mixed: existing and new rows', async () => {
      const mixedRows = [
        {
          blockNumber: DATA[1].blockNumber,
          holderAddress: DATA[1].holderAddress,
          assetId: DATA[1].assetId,
          balance: MOCK_BALANCE,
        },
        {
          blockNumber: START_BLOCK_NUMBER + 2n,
          holderAddress: EthereumAddress(
            '0x011B6E24FfB0B5f5fCc564cf4183C5BBBc96D515',
          ),
          assetId: AssetId('dai-dai-stablecoin'),
          balance: MOCK_BALANCE,
        },
      ]
      await repository.addOrUpdateMany(mixedRows)

      const result = await repository.getAll()
      expect(result).toBeAnArrayWith(DATA[0], ...mixedRows)
      expect(result).toBeAnArrayOfLength(3)
    })

    it('empty array', async () => {
      await expect(repository.addOrUpdateMany([])).not.toBeRejected()
    })
  })

  it(BalanceRepository.prototype.getAll.name, async () => {
    const result = await repository.getAll()

    expect(result).toEqual(DATA)
  })

  it(BalanceRepository.prototype.deleteAll.name, async () => {
    await repository.deleteAll()

    const result = await repository.getAll()

    expect(result).toEqual([])
  })

  it(BalanceRepository.prototype.getLatestPerHolder.name, async () => {
    const blockNumberRepository = new BlockNumberRepository(
      database,
      Logger.SILENT,
    )

    const additionalRecords = [
      {
        blockNumber: START_BLOCK_NUMBER,
        holderAddress: MOCK_HOLDER,
        assetId: AssetId('token-a'),
        balance: MOCK_BALANCE,
      },
    ]

    repository.addOrUpdateMany(additionalRecords)

    DATA.map((d, index) =>
      blockNumberRepository.add({
        timestamp: START.add(index, 'hours'),
        blockNumber: d.blockNumber,
      }),
    )

    const holderLatest = await repository.getLatestPerHolder()

    expect(holderLatest).toEqual(
      new Map([
        [
          MOCK_HOLDER,
          [
            {
              blockNumber: START_BLOCK_NUMBER + 1n,
              timestamp: START.add(1, 'hours'),
              holderAddress: MOCK_HOLDER,
              assetId: MOCK_ASSET,
              balance: MOCK_BALANCE,
            },
            {
              blockNumber: START_BLOCK_NUMBER,
              timestamp: START,
              holderAddress: MOCK_HOLDER,
              assetId: AssetId('token-a'),
              balance: MOCK_BALANCE,
            },
          ],
        ],
      ]),
    )
  })
})
