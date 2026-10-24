targetScope = 'resourceGroup'
param location string = resourceGroup().location
@minLength(3)
@maxLength(20)
param prefix string
// Deploy storage.bicep and upload the verified ZIP before this application template.
param storageAccountName string
@minLength(64)
@maxLength(64)
param packageSha256 string
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = { name: storageAccountName }
var packageBlobName = 'serviceflow-quality-${toLower(packageSha256)}.zip'
var packageUrl = '${storage.properties.primaryEndpoints.blob}packages/${packageBlobName}'
// A pre-created identity lets role assignments precede the app's first package fetch.
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-quality-runtime'
  location: location
  tags: { Project: 'ServiceFlow' }
}
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-consumption'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: {}
}
resource function 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-quality-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'functionapp'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  tags: { Project: 'ServiceFlow' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      functionAppScaleLimit: 1
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: packageUrl }
        { name: 'WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID', value: identity.id }
        { name: 'WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT', value: '1' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'AzureWebJobsStorage__credential', value: 'managedidentity' }
        { name: 'AzureWebJobsStorage__clientId', value: identity.properties.clientId }
        { name: 'SOURCE_STORAGE__blobServiceUri', value: storage.properties.primaryEndpoints.blob }
        { name: 'SOURCE_STORAGE__queueServiceUri', value: storage.properties.primaryEndpoints.queue }
        { name: 'SOURCE_STORAGE__credential', value: 'managedidentity' }
        { name: 'SOURCE_STORAGE__clientId', value: identity.properties.clientId }
      ]
    }
  }
  dependsOn: [assignments]
}
// Dedicated demo-account scope. Identity assignments may take time to propagate.
var roles = [
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
  '17d1049b-9a84-46fb-8f53-869881c3d3ab'
]
resource assignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for role in roles: {
  scope: storage
  name: guid(storage.id, identity.id, role)
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', role)
  }
}]
output functionName string = function.name
output storageAccountName string = storage.name
output packageBlobName string = packageBlobName
output runtimeIdentityName string = identity.name
