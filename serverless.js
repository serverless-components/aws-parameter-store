const aws = require('aws-sdk')
const {
  concat,
  difference,
  equals,
  find,
  forEach,
  isEmpty,
  isNil,
  map,
  merge,
  mergeDeepRight,
  not,
  pipe,
  propEq,
  reduce,
  sort,
  toPairs
} = require('ramda')
const { Component } = require('@serverless/components')

const { changeSet, deployParameters, previousParameters, removeParameters } = require('./utils')

// set retry delay configuration to prevent throttling
aws.config.update({
  maxRetries: 15,
  retryDelayOptions: {
    base: 300
  }
})

const defaults = {
  parameters: [],
  region: 'us-east-1'
}

const setParameterDefaults = (parameters) => {
  const ssmDefaults = {
    tier: 'Standard'
  }
  const ssmSecureStringDefaults = {
    kmsKey: 'alias/aws/ssm'
  }
  const secretsManagerDefaults = {
    kmsKey: 'alias/aws/secretsmanager'
  }
  return map((parameter) => {
    if (isNil(parameter.name) || isNil(parameter.value) || isNil(parameter.type)) {
      throw new Error('Invalid parameter: name, value, and type must be defined')
    }
    if (/^SSM\//.test(parameter.type)) {
      // only if parameter.type === SSM/SecureString default key to kmsKey
      // needs to be refactored when more default values are added
      const defaultSsmParameter = mergeDeepRight(ssmDefaults, parameter)
      return mergeDeepRight(
        equals(parameter.type, 'SSM/SecureString') ? ssmSecureStringDefaults : {},
        defaultSsmParameter
      )
    } else if (/^SecretsManager\//.test(parameter.type)) {
      return mergeDeepRight(secretsManagerDefaults, parameter)
    }
    return parameter
  }, parameters)
}

class AwsParameterStore extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    config.parameters = setParameterDefaults(config.parameters)

    this.ui.status(`Deploying`)

    const previous = await previousParameters(merge(config, { aws }))

    const orphanParameters = map(
      (orphanName) => find(({ name }) => name === orphanName, this.state.parameters),
      difference(
        map(({ name }) => name, this.state.parameters || []),
        map(({ name }) => name, config.parameters)
      )
    )

    if (not(isEmpty(orphanParameters))) {
      this.ui.status(`Removing deleted parameters`)
      await removeParameters(merge(config, { aws, parameters: orphanParameters }))
    }

    const changedParameters = changeSet(config.parameters, previous)

    let deployedParameters = []
    if (!isEmpty(changedParameters)) {
      this.ui.status(`Deploying parameters`)
      deployedParameters = await deployParameters(
        merge(config, { aws, parameters: changedParameters })
      )
    }

    const updatedParameters = reduce(
      (acc, parameter) => {
        if (
          !isNil(parameter) &&
          !isNil(parameter.name) &&
          isNil(find(propEq('name', parameter.name), acc))
        ) {
          acc.push(parameter)
        }
        return acc
      },
      [],
      concat(deployedParameters, previous)
    )

    this.state.parameters = updatedParameters
    await this.save()

    const outputs = pipe(
      sort((paramA, paramB) => (paramA.name < paramB.name ? -1 : 1)),
      reduce((acc, parameter) => {
        const sanitizedParameterName = parameter.name.replace(/^\//, '').replace(/\//g, '_')
        acc[sanitizedParameterName] = {
          name: parameter.name,
          arn: parameter.arn,
          version: parameter.version
        }
        return acc
      }, {})
    )(updatedParameters)

    this.ui.log()
    forEach(([key, { name, arn, version }]) => {
      this.ui.output(`${key}.name`, name)
      this.ui.output(`${key}.arn`, arn)
      this.ui.output(`${key}.version`, version)
    }, toPairs(outputs))

    return outputs
  }

  async remove(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs, this.state)
    this.ui.status(`Removing`)
    await removeParameters(merge(config, { aws }))
    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = AwsParameterStore
