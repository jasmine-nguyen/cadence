# infra/main

The main Terraform stack:

- Lambda (arm64, `runtime = "python3.12"`, matching `backend/.python-version`)
  with a raised timeout.
- EventBridge Scheduler at 22:00 `Australia/Melbourne`.
- IAM for the Lambda.
- An empty Secrets Manager secret. Values are set via CLI/console, never in
  Terraform, so they stay out of code and state.
- CloudWatch logs.

State lives in the bucket created by `infra/bootstrap`. `.terraform.lock.hcl` is
committed; state, `.terraform/` and `*.tfvars` are gitignored.
