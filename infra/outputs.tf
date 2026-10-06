output "elastic_ip" {
  description = "Point the domain's A record here."
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  value = aws_instance.app.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "deploy_bucket" {
  value = aws_s3_bucket.deploy.bucket
}

output "files_bucket" {
  value = aws_s3_bucket.files.bucket
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN variable in GitHub."
  value       = aws_iam_role.github_deploy.arn
}

output "ssm_path" {
  value = local.ssm_path
}
