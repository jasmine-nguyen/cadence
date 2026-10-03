# infra/bootstrap

One-time Terraform config: the S3 bucket that holds Terraform state for
`infra/main`, in Sydney (`ap-southeast-2`). The bucket has versioning,
Amazon-managed encryption (SSE-S3), all public access blocked, HTTPS-only
access, and old state versions expire after 90 days (the newest 10 are kept).
Locking is native S3 locking (`use_lockfile = true` in `infra/main`), no DynamoDB.

This config keeps **local state** on purpose: it creates the bucket, so its own
state can't live there.

## Cost

A few cents a month at most: one small state file plus old versions. Creating
the bucket is free.

## Run once, before `infra/main`

```sh
cd infra/bootstrap
terraform init
terraform plan    # only S3 resources in ap-southeast-2, no DynamoDB
terraform apply
terraform output -raw state_bucket_name
```

The output must equal `bucket` in the `backend "s3"` block of
`infra/main/versions.tf`. The name includes the AWS account ID, so it's written
there by hand.

## The local state file

`terraform apply` writes `terraform.tfstate` here. It's gitignored. Back it up
somewhere safe outside git (e.g. a password manager or private drive).

If it's lost, the bucket is fine; re-import it so Terraform manages it again:

```sh
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="cadence-tfstate-${ACCOUNT}-ap-southeast-2"
terraform import aws_s3_bucket.state "$BUCKET"
terraform import aws_s3_bucket_versioning.state "$BUCKET"
terraform import aws_s3_bucket_server_side_encryption_configuration.state "$BUCKET"
terraform import aws_s3_bucket_public_access_block.state "$BUCKET"
terraform import aws_s3_bucket_ownership_controls.state "$BUCKET"
terraform import aws_s3_bucket_policy.state "$BUCKET"
terraform import aws_s3_bucket_lifecycle_configuration.state "$BUCKET"
```

## Destroying

The bucket has `prevent_destroy`, so `terraform destroy` fails on purpose:
deleting it would lose the record of everything `infra/main` manages.

`.terraform.lock.hcl` is committed; state, `.terraform/` and `*.tfvars` are
gitignored.
