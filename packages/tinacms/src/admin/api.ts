import type { TinaCMS } from '@tinacms/toolkit'
import { print, buildSchema } from 'graphql'

import { diff } from '@graphql-inspector/core'

import type { Collection, TinaSchema } from '@strivemath/tinacms-schema-tools'
import type { Client } from '../internalClient'
import type { CollectionResponse, DocumentForm } from './types'

import {
  SearchClient,
  processDocumentForIndexing,
} from '@strivemath/tinacms-search/dist/index-client'
import { useCMS } from '@toolkit/react-tinacms'
import { useEffect, useState } from 'react'

export interface FilterArgs {
  filterField: string
  startsWith?: string
  before?: string
  after?: string
  booleanEquals?: boolean
}

export class TinaAdminApi {
  api: Client
  useDataLayer: boolean
  schema: TinaSchema
  searchClient?: SearchClient
  maxSearchIndexFieldLength: number = 100
  constructor(cms: TinaCMS) {
    this.api = cms.api.tina
    this.schema = cms.api.tina.schema
    if (cms.api.search && cms.api.search?.supportsClientSideIndexing()) {
      this.searchClient = cms.api.searchClient
      this.maxSearchIndexFieldLength =
        this.schema.config?.config?.search?.maxSearchIndexFieldLength || 100
    }
  }

  async isAuthenticated() {
    return await this.api.authProvider.isAuthenticated()
  }

  async checkGraphqlSchema({ localSchema }: { localSchema: any }) {
    const schemaFromCloud = await this.api.getSchema()
    const schema1 = schemaFromCloud
    const schema2 = buildSchema(print(localSchema))
    const diffOutput = await diff(schema1, schema2)
    if (diffOutput.length > 0) {
      return false
    } else {
      return true
    }
  }

  fetchCollections() {
    return this.schema.getCollections()
  }
  async renameDocument({ collection, relativePath, newRelativePath }) {
    await this.api.request(
      `#graphql
              mutation RenameDocument($collection: String!, $relativePath: String! $newRelativePath: String!) {
                updateDocument(collection: $collection, relativePath: $relativePath, params: {relativePath: $newRelativePath}){
    __typename
  }
              }
            `,
      { variables: { collection, relativePath, newRelativePath } }
    )

    if (this.searchClient) {
      const { document: doc } = await this.fetchDocument(
        collection.name,
        newRelativePath
      )
      const processed = processDocumentForIndexing(
        doc['_values'],
        `${collection.path}/${newRelativePath}`,
        collection,
        this.maxSearchIndexFieldLength
      )
      await this.searchClient.put([processed])
      await this.searchClient.del([`${collection.name}:${relativePath}`])
    }
  }

  async deleteDocument({
    collection,
    relativePath,
  }: {
    collection: string
    relativePath: string
  }) {
    await this.api.request(
      `#graphql
      mutation DeleteDocument($collection: String!, $relativePath: String!  ){
  deleteDocument(collection: $collection, relativePath: $relativePath){
    __typename
  }
}`,
      { variables: { collection, relativePath } }
    )
    await this.searchClient?.del([`${collection}:${relativePath}`])
  }
  async fetchCollection(
    collectionName: string,
    includeDocuments: boolean,
    folder: string = '',
    after?: string,
    sortKey?: string,
    order?: 'asc' | 'desc',
    filterArgs?: FilterArgs,
    graphqlFilter?: any
  ) {
    let filter = null
    const filterField = filterArgs?.filterField
    if (filterField) {
      // if we have a filterField, we'll create an empty filter object
      filter = {
        [collectionName]: {
          [filterField]: {},
        },
      }
    }
    // If we have a filterField and a startsWith value, we'll add a filter
    if (filterField && filterArgs?.startsWith) {
      filter[collectionName][filterField] = {
        ...(filter[collectionName][filterField] || {}),
        startsWith: filterArgs.startsWith,
      }
    }
    if (filterField && filterArgs?.before) {
      filter[collectionName][filterField] = {
        ...(filter[collectionName][filterField] || {}),
        before: filterArgs.before,
      }
    }
    if (filterField && filterArgs?.after) {
      filter[collectionName][filterField] = {
        ...(filter[collectionName][filterField] || {}),
        after: filterArgs.after,
      }
    }
    if (
      filterField &&
      filterArgs?.booleanEquals !== null &&
      filterArgs?.booleanEquals !== undefined
    ) {
      filter[collectionName][filterField] = {
        ...(filter[collectionName][filterField] || {}),
        eq: filterArgs.booleanEquals,
      }
    }

    // const user = await this.fetchUser()
    // const collectionDefinition = this.schema.getCollection(collectionName)
    // if (user?.group && user?.group !== 'admin') {
    //   if (collectionDefinition.fields.find((field) => field.name === 'group')) {
    //     if (!filter) filter = { [collectionName]: {} }
    //     if (!filter[collectionName].group)
    //       filter[collectionName].group = { eq: user?.group }
    //   }
    // }

    if (graphqlFilter) filter = graphqlFilter

    if (includeDocuments === true) {
      const sort = sortKey || this.schema.getIsTitleFieldName(collectionName)
      const response: { collection: CollectionResponse } =
        order === 'asc'
          ? await this.api.request(
              `#graphql
      query($collection: String!, $includeDocuments: Boolean!, $sort: String,  $limit: Float, $after: String, $filter: DocumentFilter, $folder: String) {
        collection(collection: $collection){
          name
          label
          format
          templates
          documents(sort: $sort, after: $after, first: $limit, filter: $filter, folder: $folder) @include(if: $includeDocuments) {
            totalCount
            pageInfo {
              hasPreviousPage
              hasNextPage
              startCursor
              endCursor
            }
            edges {
              node {
                __typename
                ... on Folder {
                    name
                    path
                }
                ... on Document {
                  _sys {
                    title
                    template
                    breadcrumbs
                    path
                    basename
                    relativePath
                    filename
                    extension
                  }
                }
              }
            }
          }
        }
      }`,
              {
                variables: {
                  collection: collectionName,
                  includeDocuments,
                  folder,
                  sort,
                  limit: 50,
                  after,
                  filter,
                },
              }
            )
          : await this.api.request(
              `#graphql
      query($collection: String!, $includeDocuments: Boolean!, $sort: String,  $limit: Float, $after: String, $filter: DocumentFilter, $folder: String) {
        collection(collection: $collection){
          name
          label
          format
          templates
          documents(sort: $sort, before: $after, last: $limit, filter: $filter, folder: $folder) @include(if: $includeDocuments) {
            totalCount
            pageInfo {
              hasPreviousPage
              hasNextPage
              startCursor
              endCursor
            }
            edges {
              node {
                __typename
                ... on Folder {
                    name
                    path
                }
                ... on Document {
                  _sys {
                    title
                    template
                    breadcrumbs
                    path
                    basename
                    relativePath
                    filename
                    extension
                  }
                }
              }
            }
          }
        }
      }`,
              {
                variables: {
                  collection: collectionName,
                  includeDocuments,
                  folder,
                  sort,
                  limit: 50,
                  after,
                  filter,
                },
              }
            )

      const user = await this.fetchUser()
      if (user?.group && user.group !== 'admin') {
        const filterDir = user.group

        response.collection.documents.edges =
          response.collection.documents.edges.filter((edge) => {
            const { node } = edge
            switch (node.__typename) {
              case 'Folder':
                return node.path.startsWith(`~/${filterDir}`)
              case 'Lesson':
                return node._sys.path.startsWith(`content/lessons/${filterDir}`)
              default:
                return true
            }
          })
      }

      return response.collection
    } else {
      try {
        // TODO: fix this type
        // @ts-ignore
        const collection: Collection = this.schema.getCollection(collectionName)
        return collection
      } catch (e) {
        console.error(
          `[TinaAdminAPI] Unable to fetchCollection(): ${e.message}`
        )
        return undefined
      }
    }
  }

  async fetchDocument(
    collectionName: string,
    relativePath: string,
    values: boolean = true
  ) {
    let query
    if (values) {
      query = `#graphql
        query($collection: String!, $relativePath: String!) {
          document(collection:$collection, relativePath:$relativePath) {
            ... on Document {
              _values
            }
          }
        }`
    } else {
      query = `#graphql
        query($collection: String!, $relativePath: String!) {
          document(collection:$collection, relativePath:$relativePath) {
            __typename
            ... on Document {
              _sys {
                title
                template
                breadcrumbs
                path
                basename
                relativePath
                filename
                extension
              }
            }
          }
        }`
    }
    const response: { document: DocumentForm } = await this.api.request(query, {
      variables: { collection: collectionName, relativePath },
    })

    return response
  }

  async createDocument(
    collection: Collection,
    relativePath: string,
    params: Object
  ) {
    const response = await this.api.request(
      `#graphql
      mutation($collection: String!, $relativePath: String!, $params: DocumentMutation!) {
        createDocument(
          collection: $collection,
          relativePath: $relativePath,
          params: $params
        ){__typename}
      }`,
      {
        variables: {
          collection: collection.name,
          relativePath,
          params,
        },
      }
    )

    if (this.searchClient) {
      const { document: doc } = await this.fetchDocument(
        collection.name,
        relativePath
      )
      const processed = processDocumentForIndexing(
        doc['_values'],
        `${collection.path}/${relativePath}`,
        collection,
        this.maxSearchIndexFieldLength
      )
      await this.searchClient.put([processed])
    }

    return response
  }

  async updateDocument(
    collection: Collection,
    relativePath: string,
    params: Object
  ) {
    const response = await this.api.request(
      `#graphql
      mutation($collection: String!, $relativePath: String!, $params: DocumentUpdateMutation!) {
        updateDocument(
          collection: $collection,
          relativePath: $relativePath,
          params: $params
        ){__typename}
      }`,
      {
        variables: {
          collection: collection.name,
          relativePath,
          params,
        },
      }
    )

    if (this.searchClient) {
      const { document: doc } = await this.fetchDocument(
        collection.name,
        relativePath
      )
      const processed = processDocumentForIndexing(
        doc['_values'],
        `${collection.path}/${relativePath}`,
        collection,
        this.maxSearchIndexFieldLength
      )
      await this.searchClient.put([processed])
    }

    return response
  }

  async fetchUser() {
    let authUser, userCollection
    try {
      authUser = await this.api.authProvider.getUser()
      const authEmail = authUser === true ? 'user@tina.io' : authUser.email

      userCollection = await this.fetchDocument('user', 'index.json')
      const users = userCollection.document._values.users as {
        email: string
        group?: string
      }[]

      const user = users.find((user) => user.email === authEmail)

      if (!user) {
        console.warn("couldn't find user", authEmail, users, {
          authUser,
          userCollection,
        })
      }

      return user
    } catch (err) {
      console.warn('error getting user', authUser, userCollection)
      console.error(err)
    }
  }
}

export function useIsTinaCMSAdmin() {
  const cms = useCMS()

  const [user, setUser] = useState<{
    email: string
    group?: string
  } | null>(null)

  useEffect(() => {
    const api = new TinaAdminApi(cms)
    api.fetchUser().then((user) => {
      setUser(user)
    })
  }, [cms])

  if (!user) return false
  if (!user.group || user.group === 'admin') return true
  return false
}
