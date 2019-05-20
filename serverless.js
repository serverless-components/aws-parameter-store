const aws = require('aws-sdk')
const { isEmpty, isNil, mergeDeepRight, merge, find, propEq, reduce, concat } = require('ramda')
const { Component } = require('@serverless/components')

const { changeSet, deployParameters, previousParameters, removeParameters } = require('./utils')

aws.config.update({
  maxRetries: 50,
  retryDelayOptions: {
    customBackoff: (retryCount) => {
      if (retryCount < 5) {
        return 100
      } else if (retryCount < 10) {
        return 300
      }
      return 500
    }
  }
})

const outputsList = ['parameters']

const defaults = {
  parameters: [],
  region: 'us-east-1'
}

class AwsParameterStore extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    const previous = await previousParameters(merge(config, { aws }))
    const changedParameters = changeSet({
      currentParameters: config.parameters,
      previousParameters: previous
    })
    let deployedParameters = []
    if (!isEmpty(changedParameters)) {
      deployedParameters = await deployParameters(
        merge(config, { aws, parameters: changedParameters })
      )
    }
    const updatedParams = reduce(
      (acc, parameter) => {
        if (isNil(find(propEq('name', parameter.name), acc))) {
          acc.push(parameter)
        }
        return acc
      },
      [],
      concat(deployedParameters, previous)
    )
    this.state.parameters = updatedParams
    await this.save()
    return {}
  }

  async remove(inputs = {}) {
    console.log(inputs)
    const config = mergeDeepRight(defaults, inputs, this.state)
    console.log({ config })
    await removeParameters(merge(config, { aws }))
    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = AwsParameterStore
