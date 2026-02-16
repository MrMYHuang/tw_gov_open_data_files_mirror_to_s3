variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "ap-northeast-1"
}

variable "lambda_function_name" {
  description = "Lambda function name."
  type        = string
  default     = "MirroringTwOpenDataToS3"
}

variable "create_lambda_role" {
  description = "If true, create and use a Lambda execution role in this module."
  type        = bool
  default     = true
}

variable "lambda_role_name" {
  description = "Name for Lambda execution role when create_lambda_role is true."
  type        = string
  default     = "MirroringTwOpenDataToS3-role"
}

variable "lambda_role_arn" {
  description = "Existing IAM role ARN used by Lambda when create_lambda_role is false."
  type        = string
  default     = ""

  validation {
    condition     = var.create_lambda_role || length(trimspace(var.lambda_role_arn)) > 0
    error_message = "lambda_role_arn must be set when create_lambda_role is false."
  }
}

variable "lambda_runtime" {
  description = "Lambda runtime."
  type        = string
  default     = "nodejs24.x"
}

variable "lambda_handler" {
  description = "Lambda handler entry point."
  type        = string
  default     = "index.handler"
}

variable "lambda_zip_path" {
  description = "Path to deployment zip (for example ../a.zip)."
  type        = string
  default     = "../a.zip"
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds."
  type        = number
  default     = 900
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MB."
  type        = number
  default     = 128
}

variable "lambda_architecture" {
  description = "Lambda architecture."
  type        = string
  default     = "arm64"

  validation {
    condition     = contains(["x86_64", "arm64"], var.lambda_architecture)
    error_message = "lambda_architecture must be one of: x86_64, arm64."
  }
}

variable "lambda_environment_variables" {
  description = "Environment variables for Lambda."
  type        = map(string)
  default     = {}
}

variable "enable_schedule" {
  description = "Whether to create an EventBridge schedule trigger for Lambda."
  type        = bool
  default     = false
}

variable "schedule_expression" {
  description = "EventBridge schedule expression (for example cron(0 3 * * ? *))."
  type        = string
  default     = "cron(0 3 * * ? *)"
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
