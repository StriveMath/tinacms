import { Command } from 'clipanion'
import fs from 'fs-extra'
import path from 'path'
import { buildSchema, Database } from '@strivemath/tinacms-graphql'
import { ConfigManager } from '../../config-manager'
import { logger } from '../../../logger'
import { dangerText, warnText } from '../../../utils/theme'
import { Codegen } from '../../codegen'
import { createAndInitializeDatabase, createDBServer } from '../../database'
import { BaseCommand } from '../baseCommands'

export class IndexCommand extends BaseCommand {
  static paths = [['index']]

  static usage = Command.Usage({
    category: `Commands`,
    description: `Indexes Tina`,
    examples: [
      [`A basic example`, `$0`],
      [`A second example`, `$0 --rootPath`],
    ],
  })

  async catch(error: any): Promise<void> {
    logger.error('Error occured during tinacms index')
    console.error(error)
    process.exit(1)
  }

  logDeprecationWarnings() {
    super.logDeprecationWarnings()
  }

  async execute(): Promise<number | void> {
    const configManager = new ConfigManager({
      rootPath: this.rootPath,
      legacyNoSDK: this.noSDK,
    })
    logger.info('Indexing Tina')
    this.logDeprecationWarnings()

    // Initialize the host TCP server
    createDBServer(Number(this.datalayerPort))

    let database: Database = null

    try {
      await configManager.processConfig()
      database = await createAndInitializeDatabase(
        configManager,
        Number(this.datalayerPort)
      )

      const { tinaSchema, graphQLSchema, lookup, queryDoc, fragDoc } =
        await buildSchema(configManager.config)

      const codegen = new Codegen({
        isLocal: true,
        configManager: configManager,
        port: Number(this.port),
        queryDoc,
        fragDoc,
        graphqlSchemaDoc: graphQLSchema,
        tinaSchema,
        lookup,
      })
      await codegen.execute()

      if (!configManager.isUsingLegacyFolder) {
        delete require.cache[configManager.generatedSchemaJSONPath]
        delete require.cache[configManager.generatedLookupJSONPath]
        delete require.cache[configManager.generatedGraphQLJSONPath]

        const schemaObject = require(configManager.generatedSchemaJSONPath)
        const lookupObject = require(configManager.generatedLookupJSONPath)
        const graphqlSchemaObject = require(configManager.generatedGraphQLJSONPath)

        const tinaLockFilename = 'tina-lock.json'
        const tinaLockContent = JSON.stringify({
          schema: schemaObject,
          lookup: lookupObject,
          graphql: graphqlSchemaObject,
        })
        fs.writeFileSync(
          path.join(configManager.tinaFolderPath, tinaLockFilename),
          tinaLockContent
        )

        if (configManager.hasSeparateContentRoot()) {
          const rootPath = await configManager.getTinaFolderPath(
            configManager.contentRootPath
          )
          const filePath = path.join(rootPath, tinaLockFilename)
          await fs.ensureFile(filePath)
          await fs.outputFile(filePath, tinaLockContent)
        }
      }

      await this.indexContentWithSpinner({
        database,
        graphQLSchema,
        tinaSchema,
        configManager,
      })
    } catch (e) {
      logger.error(`\n\n${dangerText(e.message)}\n`)
      if (this.verbose) {
        console.error(e)
      }
      logger.error(
        warnText(
          'Unable to index, please fix your Tina config / resolve any errors above and try again'
        )
      )
      process.exit(1)
    }

    logger.info('Done indexing!')
    await this.startSubCommand()
    process.exit(0)
  }
}
