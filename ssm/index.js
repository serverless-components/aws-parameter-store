const { concat, equals, find, flatten, isNil, map, merge, not, pick, splitEvery } = require('ramda')

const getParameterValues = async ({ ssm, parameters }) =>
  flatten(
    await Promise.all(
      map(async (chunkedParameters) => {
        const names = map(({ name }) => name, chunkedParameters)
        const { Parameters } = await ssm
          .getParameters({ Names: names, WithDecryption: true })
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
      }, splitEvery(10, parameters))
    )
  )

const describeParameters = async ({ ssm, parameters }) => {
  const names = map(({ name }) => name, parameters)
  const chunkedPreviousParameters = await Promise.all(
    map(async (namesChunk) => {
      let previousParameters = []
      let nextToken
      do {
        const response = await ssm
          .describeParameters({
            ParameterFilters: [
              {
                Key: 'Name',
                Option: 'Equals',
                Values: namesChunk
              }
            ]
          })
          .promise()
        nextToken = response.NextToken
        previousParameters = concat(previousParameters, response.Parameters)
      } while (not(isNil(nextToken)))
      return previousParameters
    }, splitEvery(50, names))
  )
  return flatten(chunkedPreviousParameters)
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
        kmsKey: parameter.KeyId,
        description: parameter.Description,
        tier: parameter.Tier
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
          KeyId: equals(parameter.AWSType, 'SecureString') ? parameter.kmsKey : undefined,
          Description: parameter.description,
          Tier: parameter.tier
        })
        .promise()
      const { Parameter } = await ssm.getParameter({ Name: parameter.name }).promise() // put parameter doesn't return arn...
      return pick(
        ['name', 'value', 'type', 'kmsKey', 'description', 'version', 'arn', 'tier'],
        merge(parameter, { version: Version, arn: Parameter.ARN })
      )
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
