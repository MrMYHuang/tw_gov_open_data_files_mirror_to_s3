terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.32.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  count = var.create_lambda_role ? 1 : 0

  name               = var.lambda_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count = var.create_lambda_role ? 1 : 0

  role       = aws_iam_role.lambda_exec[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

locals {
  effective_lambda_role_arn = var.create_lambda_role ? aws_iam_role.lambda_exec[0].arn : var.lambda_role_arn
}

resource "aws_lambda_function" "mirror" {
  function_name = var.lambda_function_name
  role          = local.effective_lambda_role_arn

  runtime = var.lambda_runtime
  handler = var.lambda_handler

  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  timeout     = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  architectures = [var.lambda_architecture]

  environment {
    variables = var.lambda_environment_variables
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution
  ]
}

resource "aws_cloudwatch_event_rule" "schedule" {
  count               = var.enable_schedule ? 1 : 0
  name                = "${var.lambda_function_name}-schedule"
  description         = "Scheduled trigger for ${var.lambda_function_name}"
  schedule_expression = var.schedule_expression
}

resource "aws_cloudwatch_event_target" "lambda" {
  count = var.enable_schedule ? 1 : 0

  rule      = aws_cloudwatch_event_rule.schedule[0].name
  target_id = "${var.lambda_function_name}-target"
  arn       = aws_lambda_function.mirror.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  count = var.enable_schedule ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mirror.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule[0].arn
}
