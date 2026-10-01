# CAD-83 / CAD-94 spike: throwaway Lambda that checks COROS + Speediance from AWS.
# CAD-94 adds an optional 7-night EventBridge Scheduler schedule (nightly_enabled).
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

variable "nightly_enabled" {
  description = "CAD-94: create the 22:00 Australia/Melbourne nightly schedule."
  type        = bool
  default     = false
}

variable "nightly_start_date" {
  description = "CAD-94: the schedule can't fire before this. RFC3339 UTC, e.g. 2026-10-02T00:00:00Z."
  type        = string
  default     = null
}

variable "nightly_end_date" {
  description = "CAD-94: the schedule stops after this. RFC3339 UTC; set it just after the 7th run."
  type        = string
  default     = null
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
  retention_in_days = 14 # long enough to collect 7 nightly results
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

# Never retry: a retried run would blur the one-result-per-night record.
resource "aws_lambda_function_event_invoke_config" "spike" {
  function_name                = aws_lambda_function.spike.function_name
  maximum_retry_attempts       = 0
  maximum_event_age_in_seconds = 3600
}

# --- CAD-94: nightly schedule (only when nightly_enabled) ---------------------

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count              = var.nightly_enabled ? 1 : 0
  name               = "${local.name}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

data "aws_iam_policy_document" "scheduler" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.spike.arn]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  count  = var.nightly_enabled ? 1 : 0
  name   = "${local.name}-scheduler"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler.json
}

resource "aws_scheduler_schedule" "nightly" {
  count = var.nightly_enabled ? 1 : 0
  name  = "${local.name}-nightly"

  schedule_expression          = "cron(0 22 * * ? *)"
  schedule_expression_timezone = "Australia/Melbourne"
  start_date                   = var.nightly_start_date
  end_date                     = var.nightly_end_date

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.spike.arn
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ mode = "nightly" })

    retry_policy {
      maximum_retry_attempts = 0
    }
  }

  depends_on = [aws_iam_role_policy.scheduler]
}

output "schedule_name" {
  value = var.nightly_enabled ? aws_scheduler_schedule.nightly[0].name : null
}

output "function_name" {
  value = aws_lambda_function.spike.function_name
}

output "secret_id" {
  value = aws_secretsmanager_secret.creds.arn
}
