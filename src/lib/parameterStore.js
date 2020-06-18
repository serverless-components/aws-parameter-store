const R = require('ramda')

const getValues = async (ssm, keys, { decrypt = true } = {}) => {
  const parameters = await ssm
    .getParameters({
      Names: keys,
      WithDecryption: decrypt
    })
    .promise()
  return R.pluck('Value', parameters.Parameters)
}

const getValue = async (ssm, key, { decrypt = true } = {}) => {
  return R.head(await getValues(ssm, [key], { decrypt }))
}

const getValuesByPath = async (ssm, path, { decrypt = true, recursive = true } = {}) => {
  const parameters = await ssm
    .getParametersByPath({
      Path: path,
      Recursive: recursive,
      WithDecryption: decrypt
    })
    .promise()
  return R.pluck('Value', parameters.Parameters)
}

module.exports = {
  getValue,
  getValues,
  getValuesByPath
}
