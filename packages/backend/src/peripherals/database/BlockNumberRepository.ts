import { Logger, UnixTime } from '@l2beat/common'
import { BlockNumberRow } from 'knex/types/tables'

import { BaseRepository } from './BaseRepository'
import { Database } from './Database'

export interface BlockNumberRecord {
  timestamp: UnixTime
  blockNumber: bigint
}

export class BlockNumberRepository extends BaseRepository {
  constructor(database: Database, logger: Logger) {
    super(database, logger)
    this.add = this.wrapAdd(this.add)
    this.getAll = this.wrapGet(this.getAll)
    this.deleteAll = this.wrapDelete(this.deleteAll)
  }

  async add(record: BlockNumberRecord) {
    const row = toRow(record)
    const knex = await this.knex()
    const [id] = await knex('block_numbers')
      .insert(row)
      .returning('block_number')
    return id
  }

  async getAll(): Promise<BlockNumberRecord[]> {
    const knex = await this.knex()
    const rows = await knex('block_numbers').select(
      'unix_timestamp',
      'block_number',
    )
    return rows.map(toRecord)
  }

  async deleteAll() {
    const knex = await this.knex()
    return await knex('block_numbers').delete()
  }
}

function toRow(record: BlockNumberRecord): BlockNumberRow {
  return {
    unix_timestamp: record.timestamp.toString(),
    block_number: Number(record.blockNumber),
  }
}

function toRecord(row: BlockNumberRow): BlockNumberRecord {
  return {
    timestamp: new UnixTime(+row.unix_timestamp),
    blockNumber: BigInt(row.block_number),
  }
}
