[![Serverless Components](https://s3.amazonaws.com/public.assets.serverless.com/images/readme_serverless_components.gif)](http://serverless.com)

<br/>

**AWS Parameter Store** ⎯⎯⎯ Easily access your AWS parameter store values in components, powered by [Serverless Components](https://github.com/serverless/components/tree/cloud).

<br/>

1. [**Configure**](#1-configure)
2. [**Deploy**](#2-deploy)
3. [**Use**](#3-use)

&nbsp;

### 1. Configure

The `aws-parameter-store` component allows you to specify the String/SecureString parameters your components need access to. The parameters are made available as outputs from the component and can be referenced by name.

Here's a complete reference of the `serverless.yml` file:

```yml
component: aws-parameter-store   # (required) name of the component.
name: myParameters               # (required) name of your component instance.
org: myOrg                       # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  parameters:
    - name: parameterFoo         # name of the output key -- parameter name
      path: /path/parameter      # fully qualified path to the parameter in parameter store -- parameter value
    - name: parameterBar
      path: /path/parameter
  region: us-east-2              # (optional) aws region to deploy to. default is us-east-1.
```

### 2. Deploy

Run `serverless deploy` to deploy (or simply just `serverless`). This will read the parameter store values and make them available to other components as output variables.

### 3. Use

Output parameters are structured like:

```
{
  [parameter name]: [parameter value]
}
```

Example:

```json
{
  "parameterFoo": "some value",
  "parameterBar": "another value"
}
```

Parameter store variables are accessed in other components using the variable `output:` syntax: `${output:[stage]:[org]:[parameter store component name].[parameter name]}`.

Example:

```yml
component: example-component
name: exampleName
org: myOrg
app: myApp
stage: dev

inputs:
  someInput: ${output:dev:myOrg:myParameters.parameterBar}
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
