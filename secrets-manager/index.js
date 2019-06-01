const { map, merge, splitEvery, flatten, not, isNil } = require('ramda')

const previous = async ({ aws, parameters, region }) => {
  const secretsManager = new aws.SecretsManager({ region })
  const secretValues = await Promise.all(
    map(async (parameter) => {
      try {
        const response = await secretsManager.getSecretValue({ SecretId: parameter.name }).promise()
        const value = response.SecretString || response.SecretBinary
        return {
          name: response.Name,
          value,
          type: parameter.type,
          version: response.VersionId,
          arn: response.ARN
        }
      } catch (error) {}
    }, parameters)
  )
  return secretValues
}

const deploy = async ({ aws, parameters, region }) => {
  const secretsManager = new aws.SecretsManager({ region })
  return Promise.all(
    map(async (parameter) => {
      let response
      if (not(parameter.update)) {
        response = await secretsManager
          .createSecret({
            Name: parameter.name,
            [parameter.AWSType]: parameter.value
          })
          .promise()
      } else {
        response = await secretsManager
          .updateSecret({
            SecretId: parameter.name,
            [parameter.AWSType]: parameter.value
          })
          .promise()
      }
      return {
        name: parameter.name,
        value: parameter.value,
        arn: response.ARN,
        version: response.VersionId
      }
    }, parameters)
  )
}

const remove = async ({ aws, parameters, region }) => {
  const secretsManager = new aws.SecretsManager({ region })
  await Promise.all(
    map(
      async (parameter) =>
        secretsManager
          .deleteSecret({
            SecretId: parameter.name,
            ForceDeleteWithoutRecovery: true // dev
          })
          .promise(),
      parameters
    )
  )
}

module.exports = {
  previous,
  deploy,
  remove
}
