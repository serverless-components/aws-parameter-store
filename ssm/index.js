const { map, merge, splitEvery, flatten, not, isNil, concat, find, equals } = require('ramda')

const getParameterValues = async ({ ssm, parameters }) => {
  const chunkedParameters = splitEvery(10, parameters)
  return flatten(
    await Promise.all(
      map(async (parameterChunk) => {
        const { Parameters } = await ssm
          .getParameters({ Names: map(({ name }) => name, parameterChunk), WithDecryption: true })
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

const describeParameters = async ({ ssm, parameters }) => {
  let previousParameters = []
  let nextToken
  do {
    const response = await ssm
      .describeParameters({
        Filters: [
          {
            Key: 'Name',
            Values: map(({ name }) => name, parameters)
          }
        ]
      })
      .promise()
    nextToken = response.NextToken
    previousParameters = concat(previousParameters, response.Parameters)
  } while (not(isNil(nextToken)))
  return previousParameters
}

const previous = async ({ aws, parameters, region }) => {
  const ssm = new aws.SSM({ region })
  const [previousParameterValues, previousParameters] = await Promise.all([
    getParameterValues({ ssm, parameters }),
    describeParameters({ ssm, parameters })
  ])
  return map((parameter) => {
    const previousParameterValue = find(({ name }) => equals(parameter.Name, name))(
      previousParameterValues
    )
    return merge(
      {
        kmsKey: parameter.KeyId
      },
      previousParameterValue
    )
  }, previousParameters)
}

const deploy = async ({ aws, parameters, region }) => {
  const ssm = new aws.SSM({ region })
  return Promise.all(
    map(async (parameter) => {
      const { Version } = await ssm
        .putParameter({
          Name: parameter.name,
          Value: parameter.value,
          Type: parameter.AWSType,
          Overwrite: parameter.overwrite || true,
          KeyId: equals(parameter.AWSType, 'SecureString') ? parameter.kmsKey : undefined
        })
        .promise()
      const { Parameter } = await ssm.getParameter({ Name: parameter.name }).promise() // put parameter doesn't return arn...
      return merge(parameter, { version: Version, arn: Parameter.ARN })
    }, parameters)
  )
}

const remove = async ({ aws, parameters, region }) => {
  const ssm = new aws.SSM({ region })
  await Promise.all(
    map(
      async (parameterChunk) =>
        ssm
          .deleteParameters({
            Names: map(({ name }) => name, parameterChunk)
          })
          .promise(),
      splitEvery(10, parameters)
    )
  )
}

module.exports = {
  previous,
  deploy,
  remove
}
