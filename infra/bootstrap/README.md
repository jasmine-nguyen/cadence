# infra/bootstrap

One-time Terraform config: the S3 bucket that holds Terraform state, with
versioning, encryption and block public access. Locking uses native S3 locking
(`use_lockfile = true`), no DynamoDB.

Run once, before `infra/main`. `.terraform.lock.hcl` is committed; state,
`.terraform/` and `*.tfvars` are gitignored.
