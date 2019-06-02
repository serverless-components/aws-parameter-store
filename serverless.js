const aws = require('aws-sdk')
const {
  isEmpty,
  isNil,
  mergeDeepRight,
  merge,
  find,
  not,
  propEq,
  reduce,
  map,
  concat,
  difference
} = require('ramda')
const { Component } = require('@serverless/components')

const { changeSet, deployParameters, previousParameters, removeParameters } = require('./utils')

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

const ssmDefaults = {
  kmsKey: 'alias/aws/ssm'
}

const secretsManagerDefaults = {
  kmsKey: 'alias/aws/secretsmanager'
}

class AwsParameterStore extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    config.parameters = map((parameter) => {
      if (/^SSM\//.test(parameter.type)) {
        return mergeDeepRight(ssmDefaults, parameter)
      } else if (/^SecretsManager\//.test(parameter.type)) {
        return mergeDeepRight(secretsManagerDefaults, parameter)
      }
      return parameter
    }, config.parameters)

    const previous = await previousParameters(merge(config, { aws }))

    const orphanParameters = map(
      (orphanName) => find(({ name }) => name === orphanName, this.state.parameters),
      difference(
        map(({ name }) => name, this.state.parameters || []),
        map(({ name }) => name, config.parameters)
      )
    )

    if (not(isEmpty(orphanParameters))) {
      await removeParameters(merge(config, { aws, parameters: orphanParameters }))
    }

    const changedParameters = changeSet(config.parameters, previous)

    let deployedParameters = []
    if (!isEmpty(changedParameters)) {
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
    return reduce(
      (acc, parameter) => {
        acc[parameter.name] = {
          arn: parameter.arn,
          version: parameter.version
        }
        return acc
      },
      {},
      updatedParameters
    )
  }

  async remove(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs, this.state)
    await removeParameters(merge(config, { aws }))
    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = AwsParameterStore
