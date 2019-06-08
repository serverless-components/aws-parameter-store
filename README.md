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
      - name: /my/credentials/username
        value: 'bob'
        type: SSM/String
        description: my username # optional
      - name: /my/credentials/password
        value: 'abc123xyz456'
        type: SSM/SecureString
        kmsKey: arn:aws:kms:us-east-1:123456789012:key/a67b9750-235a-432b-99e4-6c59516d4f07 # optional
        description: my password # optional
        tier: Standard # optional
      - name: my_credentials
        value: '{"username":"bob", "password":"abc123xyz456"}'
        type: SecretsManager/SecretString
        kmsKey: arn:aws:kms:us-east-1:123456789012:key/a67b9750-235a-432b-99e4-6c59516d4f07 # optional
        description: my credentials # optional
        resourcePolicy: # optional
          Version: '2012-10-17'
          Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::123456789012:root
            Action: secretsmanager:GetSecretValue
            Resource: "*"
```

### 4. Deploy

```console
AwsParameterStore (master)$ components

  AwsParameterStore › outputs:
  my_credentials_password.name:    /my/credentials/password
  my_credentials_password.arn:     arn:aws:ssm:us-east-1:123456789012:parameter/my/credentials/password
  my_credentials_password.version: 1
  my_credentials_username.name:    /my/credentials/username
  my_credentials_username.arn:     arn:aws:ssm:us-east-1:123456789012:parameter/my/credentials/username
  my_credentials_username.version: 1
  my_credentials.name:    my_credentials
  my_credentials.arn:     arn:aws:secretsmanager:us-east-1:123456789012:secret:my_credentials-fxdLpu
  my_credentials.version: add085ab-3dd4-48e2-9232-11e521e1da57

  4s › dev › AwsParameterStore › done

AwsParameterStore (master)$

```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
