const R = require('ramda')
const P = require('promda')
const AWS = require('aws-sdk')
const { Component } = require('@serverless/core')
const parameterStore = require('./lib/parameterStore')

const defaults = {
  region: 'us-east-1',
  stage: 'dev',
  parameters: []
}

class AwsParameterStore extends Component {
  async deploy(inputs = {}) {
    // this error message assumes that the user is running via the CLI though...
    if (Object.keys(this.credentials.aws).length === 0) {
      const msg = `Credentials not found. Make sure you have a .env file in the cwd. - Docs: https://git.io/JvArp`
      throw new Error(msg)
    }

    const config = R.mergeDeepRight(defaults, inputs)

    AWS.config.update({ region: inputs.region })
    const ssm = new AWS.SSM({
      credentials: this.credentials.aws,
      region: inputs.region
    })

    console.log('Parameter store: Resolving parameters.')

    const mapIndexed = R.addIndex (P.map);
    // [{ name: output key name, path: ssm parameter store path }]
    return P.pipe([
      // [{ name: output key name, path: ssm parameter store path }]
      mapIndexed(async (parameter, index) => {
        if (R.either (R.isNil, R.isEmpty) (parameter.name)) {
          const msg = `name for path ${parameter.path} at index ${index} must not be null, or empty.`
          throw new Error(msg)
        }
        if (R.either (R.isNil, R.isEmpty) (parameter.path)) {
          const msg = `path for name ${parameter.name} at index ${index} must not be null, or empty.`
          throw new Error(msg)
        }
        const key = parameter.path
        console.log(`Parameter store: Resolving variable: ${key}`)
        const value = await parameterStore.getValue(ssm, key)
        console.log(`Parameter store: Resolved: ${key}: ${value}`)
        return { [parameter.name]: value }
      }),
      // {parameter name: value, parameter name: value}
      R.reduce(R.mergeRight, {})
    ])(config.parameters)
  }
}

module.exports = AwsParameterStore
