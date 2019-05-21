const { map, isNil, equals, not, concat, find, reduce, propEq } = require('ramda')
const ssm = require('./ssm')

const parametersByService = (parameters) =>
  reduce(
    (acc, parameter) => {
      if (/^SSM\//.test(parameter.type)) {
        acc.ssm.push(parameter)
      } else if (/^SecretsManager\//.test(parameter.type)) {
        acc.secretsManager.push(parameter)
      }
      return acc
    },
    { ssm: [], secretsManager: [] },
    parameters
  )

const previousParameters = async ({ aws, parameters, region }) => {
  const previousSsm = await ssm.previous({
    aws,
    parameters: parametersByService(parameters).ssm,
    region
  })
  const previousSecretsManager = [] // @TODO
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
        acc.push(parameterA)
      }
      return acc
    },
    [],
    parametersA
  )
}

const deployParameters = async ({ aws, parameters, region }) => {
  return Promise.all(
    map(async (parameter) => {
      if (/^SSM\//.test(parameter.type)) {
        return ssm.deploy({ aws, parameter, region })
      } else if (/^SecretsManager\//.test(parameter.type)) {
        //
      }
      return null
    }, parameters)
  )
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
