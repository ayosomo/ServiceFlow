targetScope = 'resourceGroup'
param location string = resourceGroup().location
@minLength(3)
@maxLength(20)
param prefix string
@description('Owner-approved operator object ID, used only for the dedicated demo storage data plane.')
param operatorPrincipalId string

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take(toLower('${prefix}${uniqueString(resourceGroup().id)}'), 24)
  location: location
  tags: { Project: 'ServiceFlow' }
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    accessTier: 'Hot'
  }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource containers 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = [for name in ['incoming', 'results', 'packages']: {
  parent: blobs
  name: name
  properties: { publicAccess: 'None' }
}]
resource operatorAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, operatorPrincipalId, 'blob-operator')
  properties: {
    principalId: operatorPrincipalId
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}
output storageAccountName string = storage.name
output blobServiceUri string = storage.properties.primaryEndpoints.blob
