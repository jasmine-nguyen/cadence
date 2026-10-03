# infra/main

The main Terraform stack:

- Lambda (arm64, `runtime = "python3.12"`, matching `backend/.python-version`)
  with a raised timeout.
- EventBridge Scheduler at 22:00 `Australia/Melbourne`.
- IAM for the Lambda.
- An empty Secrets Manager secret. Values are set via CLI/console, never in
  Terraform, so they stay out of code and state.
- CloudWatch logs.

## State

State lives in the bucket created by `infra/bootstrap` (run that first), under
the key `main/terraform.tfstate`, in Sydney (`ap-southeast-2`). The backend is
written out in full in `versions.tf`, so no extra flags are needed:

```sh
cd infra/main
terraform init
```

Locking is S3 native (`use_lockfile = true`): while a run holds the lock there's
a `main/terraform.tfstate.tflock` object next to the state, removed when the run
ends. No DynamoDB table.

## IAM for whoever runs Terraform

For the state alone (on top of what the resources themselves need):

- `s3:ListBucket` on the bucket.
- `s3:GetObject`, `s3:PutObject` on `main/terraform.tfstate`.
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on
  `main/terraform.tfstate.tflock`.

`.terraform.lock.hcl` is committed; state, `.terraform/` and `*.tfvars` are
gitignored.
