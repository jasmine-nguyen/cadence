# State lives in the bucket created by infra/bootstrap (run that first).
# Locking is S3 native (use_lockfile): a .tflock object next to the state key.
# No DynamoDB lock table: DynamoDB locking is deprecated.

terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "cadence-tfstate-707938860992-ap-southeast-2"
    key          = "main/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "ap-southeast-2"

  default_tags {
    tags = {
      project = "cadence"
    }
  }
}
