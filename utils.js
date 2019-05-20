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
  const previousSecretsManager = [] //@TODO
  return concat(previousSsm, previousSecretsManager)
}

const changeSet = ({ currentParameters, previousParameters }) => {
  return reduce(
    (acc, parameter) => {
      const previousParameter = find(propEq('name', parameter.name), previousParameters)
      if (
        isNil(previousParameter) ||
        isNil(previousParameter.value) ||
        not(equals(previousParameter.value, parameter.value))
      ) {
        acc.push(parameter)
      }
      return acc
    },
    [],
    currentParameters
  )
}

const deployParameters = async ({ aws, parameters, region }) => {
  return Promise.all(
    map(async (parameter) => {
      if (/^SSM\//.test(parameter.type)) {
        return ssm.deploy({ aws, parameter, region })
      } else if (/^SecretsManager\//.test(parameter.type)) {
        console.log('SecretsManager')
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
