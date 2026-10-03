# Local state on purpose: this config creates the bucket that every other
# config keeps its state in, so its own state can't live there. Back up
# terraform.tfstate outside git (see README.md).

terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
