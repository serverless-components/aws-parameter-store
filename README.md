# AWS Parameter Store

Easily Manage Secrets on AWS using [Serverless Components](https://github.com/serverless/components).

&nbsp;

- [AWS Parameter Store](#aws-parameter-store)
    - [1. Install](#1-install)
    - [2. Create](#2-create)
    - [3. Configure](#3-configure)
    - [4. Deploy](#4-deploy)
    - [New to Components?](#new-to-components)

&nbsp;


### 1. Install

```console
$ npm install -g @serverless/components
```

### 2. Create

Just create a `serverless.yml` file

```shell
$ touch serverless.yml
$ touch .env      # your development AWS api keys
$ touch .env.prod # your production AWS api keys
```

the `.env` files are not required if you have the aws keys set globally and you want to use a single stage, but they should look like this.

```
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

```yml
# serverless.yml

name: my-service
stage: dev

myParameters:
  component: '@serverless/aws-parameter-store'
  inputs:
    parameters:
      - name: /my/parameter/name
        value: '000000'
        type: AWS/SSM/SecureString # something like this
      - name: parameter-name
        value: just-a-string
        type: AWS/SSM/String  # something like this
      - name: pg_password
        value: 'secret'
        type: AWS/SecretsManager  # something like this
        # + whatever parameters are needed, KMS id etc.
```

### 4. Deploy

```console
AwsParameterStore (master)$ components

  AwsParameterStore › outputs:
  pg_password_arn:  'arn:aws:....'


  4s › dev › AwsParameterStore › done

AwsParameterStore (master)$

```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
