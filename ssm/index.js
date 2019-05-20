const { map, propEq, concat, merge, splitEvery, pipe, flatten, find } = require('ramda')

const previous = async ({ aws, parameters, region }) => {
  const ssm = new aws.SSM({ region })
  const chunkedParameters = splitEvery(10, parameters)
  return flatten(
    await Promise.all(
      map(async (c) => {
        const { Parameters } = await ssm
          .getParameters({ Names: map(({ name }) => name, c), WithDecryption: true })
          .promise()
        return map(
          (parameter) => ({
            name: parameter.Name,
            value: parameter.Value,
            type: `SSM/${parameter.Type}`,
            version: parameter.Version,
            arn: parameter.ARN
          }),
          Parameters
        )
      }, chunkedParameters)
    )
  )
}

const deploy = async ({ aws, parameter, region }) => {
  const ssm = new aws.SSM({ region })
  const { Version } = await ssm
    .putParameter({
      Name: parameter.name,
      Value: parameter.value,
      Type: parameter.type.replace(/^SSM\//, ''),
      Overwrite: parameter.overwrite || true
    })
    .promise()
  return merge(parameter, { version: Version })
}

const remove = async ({ aws, parameters, region }) => {
  const ssm = new aws.SSM({ region })
  return ssm.deleteParameters({
    Names: map(({ name })=> name, parameters)
  }).promise()
}

module.exports = {
  previous,
  deploy,
  remove
}
