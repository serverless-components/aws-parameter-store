const {
  concat,
  equals,
  filter,
  find,
  isEmpty,
  isNil,
  merge,
  not,
  pick,
  propEq,
  reduce
} = require('ramda')
const ssm = require('./ssm')
const secretsManager = require('./secrets-manager')

const parametersByService = (parameters) =>
  reduce(
    (acc, parameter) => {
      if (/^SSM\//.test(parameter.type)) {
        acc.ssm.push(merge(parameter, { AWSType: parameter.type.replace(/^SSM\//, '') }))
      } else if (/^SecretsManager\//.test(parameter.type)) {
        acc.secretsManager.push(
          merge(parameter, { AWSType: parameter.type.replace(/^SecretsManager\//, '') })
        )
      }
      return acc
    },
    { ssm: [], secretsManager: [] },
    parameters
  )

const previousParameters = async ({ aws, parameters, region }) => {
  const { ssm: ssmParameters, secretsManager: secretsManagerParameters } = parametersByService(
    parameters
  )
  const [previousSsm, previousSecretsManager] = await Promise.all([
    ssm.previous({
      aws,
      parameters: ssmParameters,
      region
    }),
    secretsManager.previous({
      aws,
      parameters: secretsManagerParameters,
      region
    })
  ])
  return concat(previousSsm, previousSecretsManager)
}

const changeSet = (parametersA, parametersB) => {
  return reduce(
    (acc, parameterA) => {
      let parameterB = null
      try {
        parameterB = find(propEq('name', parameterA.name), parametersB)
      } catch (error) {}
      const diffKeys = ['name', 'value', 'type', 'kmsKey', 'description', 'resourcePolicy', 'tier']
      const diffA = pick(diffKeys, parameterA)
      const diffB = not(isNil(parameterB)) ? pick(diffKeys, parameterB) : undefined

      // SecretBinary diff
      if (diffA.type === 'SecretsManager/SecretBinary') {
        diffA.value = Buffer.from(diffA.value)
        diffB.value = Buffer.from(diffB.value)
      }

      const diff = filter((key) => {
        return isNil(diffB) || not(equals(diffA[key], diffB[key]))
      })(diffKeys)
      if (!isEmpty(diff)) {
        const update = !!diffB
        acc.push(merge(parameterA, { update, diff }))
      }
      return acc
    },
    [],
    parametersA
  )
}

const deployParameters = async ({ aws, parameters, region }) => {
  const { ssm: ssmParameters, secretsManager: secretsManagerParameters } = parametersByService(
    parameters
  )
  const [deployedSsm, deployedSecretsManager] = await Promise.all([
    ssm.deploy({
      aws,
      parameters: ssmParameters,
      region
    }),
    secretsManager.deploy({
      aws,
      parameters: secretsManagerParameters,
      region
    })
  ])
  return concat(deployedSsm, deployedSecretsManager)
}

const removeParameters = async ({ aws, parameters, region }) => {
  const { ssm: ssmParameters, secretsManager: secretsManagerParameters } = parametersByService(
    parameters
  )
  await Promise.all([
    ssm.remove({
      aws,
      parameters: ssmParameters,
      region
    }),
    secretsManager.remove({
      aws,
      parameters: secretsManagerParameters,
      region
    })
  ])
}

module.exports = {
  changeSet,
  previousParameters,
  deployParameters,
  removeParameters
}
