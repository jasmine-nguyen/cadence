output "state_bucket_name" {
  description = "S3 bucket holding Terraform state. Must match the backend bucket in infra/main/versions.tf."
  value       = aws_s3_bucket.state.id
}

output "region" {
  description = "Region the state bucket lives in."
  value       = "ap-southeast-2"
}
