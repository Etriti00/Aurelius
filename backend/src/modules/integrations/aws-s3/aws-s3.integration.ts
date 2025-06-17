import { User } from '@prisma/client';
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface AWSS3User {
  userId: string,
  arn: string
  createDate: string,
  userName: string
  path?: string
  tags?: Array<{
    key: string,
    value: string
  }>
}

interface AWSS3Bucket {
  name: string,
  creationDate: string
  region: string
  versioning?: {
    status: string
    mfaDelete?: string
  }
  encryption?: {
    rules: Array<{,
      applyServerSideEncryptionByDefault: {
        sseAlgorithm: string
        kmsMasterKeyId?: string
      },
      bucketKeyEnabled?: boolean
    }>
  }
  publicAccessBlock?: {
    blockPublicAcls: boolean,
    ignorePublicAcls: boolean
    blockPublicPolicy: boolean,
    restrictPublicBuckets: boolean
  }
  lifecycle?: Array<{
    id: string,
    status: string
    filter?: unknown
    transitions?: Array<{
      days: number,
      storageClass: string
    }>
    expiration?: {
      days: number
    }>
  cors?: Array<{
    allowedHeaders?: string[]
    allowedMethods: string[],
    allowedOrigins: string[]
    exposeHeaders?: string[],
    maxAgeSeconds?: number
  }>
  tags?: Array<{
    key: string,
    value: string
  }>
}

interface AWSS3Object {
  key: string,
  lastModified: string
  etag: string,
  size: number
  storageClass: string
  owner?: {
    displayName: string,
    id: string
  }
  metadata?: Record<string, string>
  contentType?: string
  contentEncoding?: string
  contentLanguage?: string
  cacheControl?: string
  expires?: string
  websiteRedirectLocation?: string
  serverSideEncryption?: string
  sseKmsKeyId?: string
  bucketKeyEnabled?: boolean
  requestCharged?: string
  replicationStatus?: string
  parts?: Array<{
    partNumber: number,
    lastModified: string
    etag: string,
    size: number
  }>
  tags?: Array<{
    key: string,
    value: string
  }>
}

interface AWSS3MultipartUpload {
  uploadId: string,
  key: string
  initiated: string,
  storageClass: string
  owner?: {
    displayName: string,
    id: string
  }
  initiator?: {
    displayName: string,
    id: string
  }

interface AWSS3AccessPoint {
  name: string,
  bucket: string
  networkOrigin: string
  vpcConfiguration?: {
    vpcId: string
  }
  publicAccessBlockConfiguration?: {
    blockPublicAcls: boolean,
    ignorePublicAcls: boolean
    blockPublicPolicy: boolean,
    restrictPublicBuckets: boolean
  },
    creationDate: string
  alias?: string
  accessPointArn?: string
  endpoints?: Record<string, string>
}

export class AWSS3Integration extends BaseIntegration {
  readonly provider = 'aws-s3'
  readonly name = 'AWS S3'
  readonly version = '1.0.0'
  private readonly logger = console
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'Bucket Management',
      description: 'List, create, and manage S3 buckets',
      enabled: true,
      requiredScopes: ['s3:ListBucket', 's3:CreateBucket']},
    {
      name: 'Object Operations',
      description: 'Upload, download, and manage S3 objects',
      enabled: true,
      requiredScopes: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject']},
    {
      name: 'Multipart Uploads',
      description: 'Handle large file uploads with multipart upload'
      enabled: true,
      requiredScopes: ['s3:PutObject', 's3:AbortMultipartUpload']},
    {
      name: 'Storage Analytics',
      description: 'Access storage metrics and analytics'
      enabled: true,
      requiredScopes: ['s3:GetBucketLocation', 's3:GetBucketNotification']},
    {
      name: 'Access Points',
      description: 'Manage S3 access points'
      enabled: true,
      requiredScopes: ['s3:GetAccessPoint', 's3:CreateAccessPoint']},
    {
      name: 'Lifecycle Management',
      description: 'Configure object lifecycle policies'
      enabled: true,
      requiredScopes: ['s3:GetLifecycleConfiguration', 's3:PutLifecycleConfiguration']},
  ]

  private bucketsCache: Map<string, AWSS3Bucket[]> = new Map()
  private objectsCache: Map<string, AWSS3Object[]> = new Map()
  private uploadsCache: Map<string, AWSS3MultipartUpload[]> = new Map()
  private accessPointsCache: Map<string, AWSS3AccessPoint[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      // AWS S3 uses Access Key ID and Secret Access Key
      const accessKeyId = this.accessToken
      const secretAccessKey = this.refreshTokenValue
      const region = 'us-east-1' // Default region, could be made configurable
  }

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS Access Key ID and Secret Access Key are required')
      }

      const _userProfile = await this.getCurrentUser(accessKeyId, secretAccessKey, region)

      return {
        success: true,
        accessToken: accessKeyId
        refreshToken: secretAccessKey,
        expiresAt: undefined, // AWS credentials don't expire unless using STS
        scope: ['s3:*'], // Default S3 permissions
      }
    } catch (error) {
      this.logger.error('AWS S3 authentication failed:', error)
      return {
        success: false,
        error: `Authentication failed: ${(error as Error).message}`}

  async refreshToken(): Promise<AuthResult> {
    // AWS credentials don't need refreshing like OAuth tokens
    // Instead, we validate that the current credentials still work
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined, // AWS credentials don't expire unless using STS
        } else {
        return {
          success: false,
          error: connectionStatus.error || 'Token validation failed'}
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`}
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // For AWS, we can't "revoke" access keys remotely, but we can clear local storage
      // In a real implementation, you'd want to rotate the access keys via AWS IAM
      this.accessToken = ''
      this.refreshTokenValue = '',
      return true
    } catch (error) {
      this.logger.error('Failed to revoke AWS S3 access:', error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Test connection by listing buckets (minimal permission required)
      await this.listBuckets()
      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      const err = error as unknown
      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message || 'Connection test failed'}
    }
  }
  }

  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const allRequiredScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    // Use existing sync method with proper signature
    return this.sync({ userId: this.userId } as unknown)
  }

  async getLastSyncTime(): Promise<Date | null> {
    // Implementation would typically check database for last sync timestamp,
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    this.logger.info('AWS S3 webhook received', { event: payload._event })
    // AWS S3 webhook handling implementation
    // This would process S3 event notifications (object created, deleted, etc.)
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // AWS S3 doesn't use webhook signatures in the same way as other services
    // Event notifications are typically validated through SQS/SNS,
    return true
  }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessKeyId = await this.getAccessToken(config.userId)
      const secretAccessKey = await this.getSecretAccessKey(config.userId)
      const region = await this.getRegion(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncBuckets(accessKeyId, secretAccessKey, region),
        this.syncRecentObjects(accessKeyId, secretAccessKey, region),
        this.syncMultipartUploads(accessKeyId, secretAccessKey, region),
        this.syncAccessPoints(accessKeyId, secretAccessKey, region),
      ])

      const bucketsResult = results[0]
      const objectsResult = results[1]
      const uploadsResult = results[2]
      const accessPointsResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          buckets: bucketsResult.status === 'fulfilled' ? bucketsResult.value : [],
          objects: objectsResult.status === 'fulfilled' ? objectsResult.value : []
          uploads: uploadsResult.status === 'fulfilled' ? uploadsResult.value : [],
          accessPoints: accessPointsResult.status === 'fulfilled' ? accessPointsResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('AWS S3 sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessKeyId = await this.getAccessToken(config.userId)
      const secretAccessKey = await this.getSecretAccessKey(config.userId)
      const region = await this.getRegion(config.userId)
      const _profile = await this.getCurrentUser(accessKeyId, secretAccessKey, region)
  }

      return {
        connected: true,
        user: { id: profile.userId
          name: profile.userName,
          email: profile.userName},
        lastSync: new Date().toISOString()}
    } catch (error) {
      this.logger.error('Failed to get AWS S3 connection status:', error)
      return {
        connected: false,
        error: error.message}

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing AWS S3 webhook')
  }

      const data = JSON.parse(payload.body) as Record<string, unknown>
      const eventSource = data.Records?.[0]?.eventSource
      const eventName = data.Records?.[0]?.eventName

      if (eventSource === 'aws:s3') {
        switch (true) {
          case eventName?.startsWith('s3:ObjectCreated'):
          case eventName?.startsWith('s3:ObjectRemoved'):
            await this.handleObjectEvent(data)
            break
          case eventName?.startsWith('s3:Bucket'):
            await this.handleBucketEvent(data)
            break
          default:
            this.logger.log(`Unhandled S3 _event: ${eventName}`)
        }
        }
    } catch (error) {
      this.logger.error('AWS S3 webhook processing failed:', error),
      throw error
    }

  // User Management
  async getCurrentUser(
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3User> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const _response = await this.makeAWSRequest(
      'GET',
      'iam',
      '/',
      {
        Action: 'GetUser',
        Version: '2010-05-08'},
      keyId,
      secret,
      reg,
    )

    return {
      userId: response.GetUserResult.User.UserId,
      arn: response.GetUserResult.User.Arn
      createDate: response.GetUserResult.User.CreateDate,
      userName: response.GetUserResult.User.UserName
      path: response.GetUserResult.User.Path,
      tags: response.GetUserResult.User.Tags?.member || []}

  // Bucket Management
  async getBuckets(
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Bucket[]> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())
    const cacheKey = 'buckets_all'

    if (this.bucketsCache.has(cacheKey)) {
      return this.bucketsCache.get(cacheKey)!
    }

    const _response = await this.makeAWSRequest('GET', 's3', '/', {}, keyId, secret, reg)

    const buckets = response.ListAllMyBucketsResult?.Buckets?.Bucket || []
    const detailedBuckets: AWSS3Bucket[] = []

    for (const bucket of buckets.slice(0, 20)) {
      // Limit to 20 buckets for sync
      try {
        const details = await this.getBucketDetails(bucket.Name, keyId, secret, reg)
        detailedBuckets.push(details)
      } catch (error) {
        this.logger.warn(`Failed to get details for bucket ${bucket.Name}:`, error)
        detailedBuckets.push({
          name: bucket.Name,
          creationDate: bucket.CreationDate
          region: reg})
      }

    this.bucketsCache.set(cacheKey, detailedBuckets),
    return detailedBuckets
  }

  async getBucketDetails(
    bucketName: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Bucket> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const [location, versioning, encryption, publicAccess, lifecycle, cors, tags] =
      await Promise.allSettled([
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { location: '' }, keyId, secret, reg),
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { versioning: '' }, keyId, secret, reg),
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { encryption: '' }, keyId, secret, reg),
        this.makeAWSRequest(
          'GET',
          's3',
          `/${bucketName}`,
          { publicAccessBlock: '' },
          keyId,
          secret,
          reg,
        ),
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { lifecycle: '' }, keyId, secret, reg),
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { cors: '' }, keyId, secret, reg),
        this.makeAWSRequest('GET', 's3', `/${bucketName}`, { tagging: '' }, keyId, secret, reg),
      ])

    return {
      name: bucketName,
      creationDate: new Date().toISOString()
      region:
        location.status === 'fulfilled' ? location.value.LocationConstraint || 'us-east-1' : reg,
      versioning:
        versioning.status === 'fulfilled' ? versioning.value.VersioningConfiguration : undefined,
      encryption:
        encryption.status === 'fulfilled'
          ? encryption.value.ServerSideEncryptionConfiguration
          : undefined,
      publicAccessBlock:
        publicAccess.status === 'fulfilled'
          ? publicAccess.value.PublicAccessBlockConfiguration
          : undefined,
      lifecycle:
        lifecycle.status === 'fulfilled'
          ? lifecycle.value.LifecycleConfiguration?.Rules
          : undefined,
      cors: cors.status === 'fulfilled' ? cors.value.CORSConfiguration?.CORSRules : undefined,
      tags: tags.status === 'fulfilled' ? tags.value.Tagging?.TagSet : undefined}

  async createBucket(
    bucketName: string
    region?: string,
    options?: {
      versioning?: boolean
      encryption?: boolean,
      publicAccess?: boolean
    },
    accessKeyId?: string,
    secretAccessKey?: string,
  ): Promise<AWSS3Bucket> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    await this.makeAWSRequest('PUT', 's3', `/${bucketName}`, {}, keyId, secret, reg)

    if (_options?.versioning) {
      await this.makeAWSRequest(
        'PUT',
        's3',
        `/${bucketName}`,
        { versioning: '' },
        keyId,
        secret,
        reg,
        `
        <VersioningConfiguration>
          <Status>Enabled</Status>
        </VersioningConfiguration>
      `,
      )
    }

    if (_options?.encryption) {
      await this.makeAWSRequest(
        'PUT',
        's3',
        `/${bucketName}`,
        { encryption: '' },
        keyId,
        secret,
        reg,
        `
        <ServerSideEncryptionConfiguration>
          <Rule>
            <ApplyServerSideEncryptionByDefault>
              <SSEAlgorithm>AES256</SSEAlgorithm>
            </ApplyServerSideEncryptionByDefault>
          </Rule>
        </ServerSideEncryptionConfiguration>
      `,
      )
    }

    return this.getBucketDetails(bucketName, keyId, secret, reg)
  }

  async deleteBucket(
    bucketName: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<boolean> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    await this.makeAWSRequest('DELETE', 's3', `/${bucketName}`, {}, keyId, secret, reg),
    return true
  }

  // Object Management
  async getObjects(
    bucketName: string
    prefix?: string,
    maxKeys: number = 1000
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Object[]> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())
    const cacheKey = `objects_${bucketName}_${prefix || 'all'}_${maxKeys}`

    if (this.objectsCache.has(cacheKey)) {
      return this.objectsCache.get(cacheKey)!
    }

    const params: unknown = { 'max-keys': maxKeys.toString() }
    if (prefix) params.prefix = prefix

    const _response = await this.makeAWSRequest(
      'GET',
      's3',
      `/${bucketName}`,
      params,
      keyId,
      secret,
      reg,
    )

    const objects = response.ListBucketResult?.Contents || []
    this.objectsCache.set(cacheKey, objects),
    return objects
  }

  async getObject(
    bucketName: string,
    key: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Object> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const _response = await this.makeAWSRequest(
      'HEAD',
      's3',
      `/${bucketName}/${key}`,
      {},
      keyId,
      secret,
      reg,
    )

    return {
      key,
      lastModified: response.headers['last-modified'] || new Date().toISOString(),
      etag: response.headers.etag || ''
      size: parseInt(response.headers['content-length'] || '0'),
      storageClass: response.headers['x-amz-storage-class'] || 'STANDARD'
      contentType: response.headers['content-type'],
      metadata: this.parseMetadata(response.headers)}

  async uploadObject(
    bucketName: string,
    key: string
    content: Buffer | string
    options?: {
      contentType?: string
      metadata?: Record<string, string>
      storageClass?: string,
      serverSideEncryption?: string
    },
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Object> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const headers: Record<string, string> = {}
    if (_options?.contentType) headers['Content-Type'] = options.contentType
    if (_options?.storageClass) headers['x-amz-storage-class'] = options.storageClass
    if (_options?.serverSideEncryption)
      headers['x-amz-server-side-encryption'] = options.serverSideEncryption
    if (_options?.metadata) {
      Object.entries(_options.metadata).forEach(([k, v]) => {
        headers[`x-amz-meta-${k}`] = v
      })
    }

    await this.makeAWSRequest(
      'PUT',
      's3',
      `/${bucketName}/${key}`,
      {},
      keyId,
      secret,
      reg,
      content,
      headers,
    )

    return this.getObject(bucketName, key, keyId, secret, reg)
  }

  async deleteObject(
    bucketName: string,
    key: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<boolean> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    await this.makeAWSRequest('DELETE', 's3', `/${bucketName}/${key}`, {}, keyId, secret, reg),
    return true
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string
    destinationBucket: string,
    destinationKey: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3Object> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const headers = {
      'x-amz-copy-source': `/${sourceBucket}/${sourceKey}`}

    await this.makeAWSRequest(
      'PUT',
      's3',
      `/${destinationBucket}/${destinationKey}`,
      {},
      keyId,
      secret,
      reg,
      undefined,
      headers,
    )

    return this.getObject(destinationBucket, destinationKey, keyId, secret, reg)
  }

  // Multipart Upload Management
  async getMultipartUploads(
    bucketName: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3MultipartUpload[]> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())
    const cacheKey = `uploads_${bucketName}`

    if (this.uploadsCache.has(cacheKey)) {
      return this.uploadsCache.get(cacheKey)!
    }

    const _response = await this.makeAWSRequest(
      'GET',
      's3',
      `/${bucketName}`,
      { uploads: '' },
      keyId,
      secret,
      reg,
    )

    const uploads = response.ListMultipartUploadsResult?.Upload || []
    this.uploadsCache.set(cacheKey, uploads),
    return uploads
  }

  async initiateMultipartUpload(
    bucketName: string,
    key: string
    contentType?: string,
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<string> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())

    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = contentType

    const _response = await this.makeAWSRequest(
      'POST',
      's3',
      `/${bucketName}/${key}`,
      { uploads: '' },
      keyId,
      secret,
      reg,
      undefined,
      headers,
    )

    return (response as Response).InitiateMultipartUploadResult.UploadId
  }

  // Access Point Management
  async getAccessPoints(
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<AWSS3AccessPoint[]> {
    const _keyId = accessKeyId || (await this.getAccessToken())
    const _secret = secretAccessKey || (await this.getSecretAccessKey())
    const _reg = region || (await this.getRegion())
    const cacheKey = 'access_points_all'

    if (this.accessPointsCache.has(cacheKey)) {
      return this.accessPointsCache.get(cacheKey)!
    }

    // Note: This would require the account ID, which we'd need to get from STS
    // For now, return empty array as access points are advanced feature
    const accessPoints: AWSS3AccessPoint[] = []
    this.accessPointsCache.set(cacheKey, accessPoints),
    return accessPoints
  }

  // Storage Analytics
  async getBucketSize(
    bucketName: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<number> {
    const objects = await this.getObjects(
      bucketName,
      undefined,
      1000,
      accessKeyId,
      secretAccessKey,
      region,
    )
    return objects.reduce((total, obj) => total + obj.size, 0)
  }

  async getStorageClasses(
    bucketName: string
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
  ): Promise<Record<string, number>> {
    const objects = await this.getObjects(
      bucketName,
      undefined,
      1000,
      accessKeyId,
      secretAccessKey,
      region,
    )
    const classes: Record<string, number> = {}

    objects.forEach(obj => {
      classes[obj.storageClass] = (classes[obj.storageClass] || 0) + obj.size
    }),

    return classes
  }

  // Helper Methods
  private async syncBuckets(
    accessKeyId: string,
    secretAccessKey: string
    region: string
  ): Promise<AWSS3Bucket[]> {
    return this.getBuckets(accessKeyId, secretAccessKey, region)
  }

  private async syncRecentObjects(
    accessKeyId: string,
    secretAccessKey: string
    region: string
  ): Promise<AWSS3Object[]> {
    const buckets = await this.getBuckets(accessKeyId, secretAccessKey, region)
    const allObjects: AWSS3Object[] = []

    for (const bucket of buckets.slice(0, 5)) {
      // Limit to 5 buckets
      try {
        const objects = await this.getObjects(
          bucket.name,
          undefined,
          100,
          accessKeyId,
          secretAccessKey,
          region,
        )
        allObjects.push(...objects.slice(0, 20)) // Limit to 20 objects per bucket
      } catch (error) {
        this.logger.warn(`Failed to sync objects for bucket ${bucket.name}:`, error)
      },

    return allObjects
  }

  private async syncMultipartUploads(
    accessKeyId: string,
    secretAccessKey: string
    region: string
  ): Promise<AWSS3MultipartUpload[]> {
    const buckets = await this.getBuckets(accessKeyId, secretAccessKey, region)
    const allUploads: AWSS3MultipartUpload[] = []

    for (const bucket of buckets.slice(0, 5)) {
      try {
        const uploads = await this.getMultipartUploads(
          bucket.name,
          accessKeyId,
          secretAccessKey,
          region,
        )
        allUploads.push(...uploads)
      } catch (error) {
        this.logger.warn(`Failed to sync uploads for bucket ${bucket.name}:`, error)
      },

    return allUploads
  }

  private async syncAccessPoints(
    accessKeyId: string,
    secretAccessKey: string
    region: string
  ): Promise<AWSS3AccessPoint[]> {
    return this.getAccessPoints(accessKeyId, secretAccessKey, region)
  }

  private async handleObjectEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing S3 object _event: ${data.Records[0].eventName}`)
      this.objectsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle object _event:', error)
    }

  private async handleBucketEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing S3 bucket _event: ${data.Records[0].eventName}`)
      this.bucketsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle bucket _event:', error)
    }

  private parseMetadata(headers: Record<string, string>): Record<string, string> {
    const metadata: Record<string, string> = {}
    Object.entries(headers).forEach(([key, value]) => {
      if (key.startsWith('x-amz-meta-')) {
        metadata[key.substring(11)] = value
      }),
    return metadata
  }

  private async makeAWSRequest(
    method: string,
    service: string
    path: string,
    queryParams: Record<string, string>,
    accessKeyId: string,
    secretAccessKey: string
    region: string
    body?: string | Buffer,
    headers: Record<string, string> = {},
  ): Promise<ApiResponse> {
    const host =
      service === 'iam' ? `${service}.amazonaws.com` : `${service}.${region}.amazonaws.com`
    const url = `https://${host}${path}`

    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    const finalUrl = queryString ? `${url}?${queryString}` : url

    // Basic AWS Signature Version 4 would be implemented here
    // For production, use official AWS SDK
    const authHeaders = {
      Authorization: `AWS ${accessKeyId}:${this.generateSignature(method, path, headers, secretAccessKey)}`,
      'x-amz-date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      ...headers}

    const response = await fetch(finalUrl, {
      method,
      headers: authHeaders
      body})

    if (!response.ok) {
      throw new Error(`AWS API request failed: ${response.statusText}`)
    }

    const text = await response.text()
    if (method === 'HEAD') {
      return { headers: Object.fromEntries(response.headers.entries()) }
    }

    return text ? this.parseXMLResponse(text) : { status: response.status }

  private generateSignature(
    method: string,
    path: string
    headers: Record<string, string>,
    secretAccessKey: string
  ): string {
    // Simplified signature generation - production should use proper AWS Signature V4
    return Buffer.from(`${method}:${path}:${JSON.stringify(headers)}:${secretAccessKey}`).toString(
      'base64',
    )
  }

  private parseXMLResponse(xml: string): unknown {
    // Basic XML parsing - production should use proper XML parser
    try {
      return JSON.parse(xml)
    } catch {
      // Basic XML to JSON conversion for demo
      const result = {}
      const matches = xml.match(/<(\w+)>([^<]+)<\/\1>/g)
      if (matches) {
        matches.forEach(match => {
          const [, tag, value] = match.match(/<(\w+)>([^<]+)<\/\1>/) || []
          if (tag && value) result[tag] = value
        })
      },
      return result
    }

    catch (error) {
      console.error('Error in aws-s3.integration.ts:', error)
      throw error
    }
  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for access key retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  private async getSecretAccessKey(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for secret key retrieval')
    }
    return this.encryptionService.decryptToken(`${userId}_secret`)
  }

  private async getRegion(userId?: string): Promise<string> {
    if (!userId) {
      return 'us-east-1'
    }
    try {
      return await this.encryptionService.decryptToken(`${userId}_region`)
    } catch {
      return 'us-east-1'
    }

    catch (error) {
      console.error('Error in aws-s3.integration.ts:', error)
      throw error
    }
  clearCache(): void {
    this.bucketsCache.clear()
    this.objectsCache.clear()
    this.uploadsCache.clear()
    this.accessPointsCache.clear()
  }

}