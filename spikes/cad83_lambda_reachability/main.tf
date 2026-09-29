# CAD-83 spike: throwaway Lambda that checks COROS + Speediance reachability.
# Local state on purpose (no state bucket exists yet). Destroy after the spike.

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "region" {
  description = "AWS region to test from."
  type        = string
  default     = "ap-southeast-2"
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      purpose = "cad-83-spike"
    }
  }
}

locals {
  name = "cadence-spike-cad83-${var.region}"
  zip  = "${path.module}/build/spike.zip"
}

# Empty secret: the value is set by CLI so credentials never touch Terraform state.
resource "aws_secretsmanager_secret" "creds" {
  name                    = local.name
  recovery_window_in_days = 0
}

resource "aws_cloudwatch_log_group" "spike" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 1
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "spike" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "spike" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.spike.arn}:*"]
  }

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.creds.arn]
  }
}

resource "aws_iam_role_policy" "spike" {
  name   = local.name
  role   = aws_iam_role.spike.id
  policy = data.aws_iam_policy_document.spike.json
}

resource "aws_lambda_function" "spike" {
  function_name    = local.name
  role             = aws_iam_role.spike.arn
  architectures    = ["arm64"]
  runtime          = "python3.12"
  handler          = "handler.handler"
  timeout          = 180
  memory_size      = 512
  filename         = local.zip
  source_code_hash = filebase64sha256(local.zip)

  environment {
    variables = {
      HOME                   = "/tmp"
      PYTHON_KEYRING_BACKEND = "keyring.backends.null.Keyring"
      COROS_REGION           = "us"
      SPEEDIANCE_BIN         = "/var/task/speediance-cli"
      SPEEDIANCE_TOKEN_CACHE = "/tmp/speediance/token.json"
      SPIKE_SECRET_ID        = aws_secretsmanager_secret.creds.arn
    }
  }

  depends_on = [aws_cloudwatch_log_group.spike, aws_iam_role_policy.spike]
}

output "function_name" {
  value = aws_lambda_function.spike.function_name
}

output "secret_id" {
  value = aws_secretsmanager_secret.creds.arn
}
