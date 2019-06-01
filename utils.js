const { map, isNil, equals, not, concat, find, reduce, propEq, merge } = require('ramda')
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
      const parameterB = find(propEq('name', parameterA.name), parametersB)
      if (
        isNil(parameterB) ||
        isNil(parameterB.value) ||
        not(equals(parameterB.value, parameterA.value))
      ) {
        const update = !!(parameterB && parameterB.value)
        acc.push(merge(parameterA, { update }))
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
  await ssm.remove({
    aws,
    parameters: parametersByService(parameters).ssm,
    region
  })
}

module.exports = {
  changeSet,
  previousParameters,
  deployParameters,
  removeParameters
}
