output "lambda_function_name" {
  value       = aws_lambda_function.mirror.function_name
  description = "Deployed Lambda function name."
}

output "lambda_function_arn" {
  value       = aws_lambda_function.mirror.arn
  description = "Deployed Lambda function ARN."
}

output "lambda_role_arn" {
  value       = local.effective_lambda_role_arn
  description = "IAM role ARN attached to Lambda."
}

output "lambda_last_modified" {
  value       = aws_lambda_function.mirror.last_modified
  description = "Last modification timestamp of Lambda."
}
