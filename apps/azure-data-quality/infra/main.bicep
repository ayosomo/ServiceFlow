targetScope = 'resourceGroup'
param location string = resourceGroup().location
@minLength(3)
@maxLength(20)
param prefix string
var storageName = toLower('${prefix}${uniqueString(resourceGroup().id)}')
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take(storageName, 24)
  location: location
  tags: { Project: 'ServiceFlow' }
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2', supportsHttpsTrafficOnly: true, allowBlobPublicAccess: false }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource incoming 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'incoming'
  properties: { publicAccess: 'None' }
}
resource results 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'results'
  properties: { publicAccess: 'None' }
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
  identity: { type: 'SystemAssigned' }
  tags: { Project: 'ServiceFlow' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'SOURCE_STORAGE__blobServiceUri', value: storage.properties.primaryEndpoints.blob }
        { name: 'SOURCE_STORAGE__queueServiceUri', value: storage.properties.primaryEndpoints.queue }
      ]
    }
  }
}
// Dedicated demo-account scope. Identity assignments may take time to propagate.
var roles = [
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
  '17d1049b-9a84-46fb-8f53-869881c3d3ab'
]
resource assignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for role in roles: {
  scope: storage
  name: guid(storage.id, function.id, role)
  properties: {
    principalId: function.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', role)
  }
}]
output functionName string = function.name
output storageAccountName string = storage.name
