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
  params_json               = jsondecode(file("${path.module}/../params.json"))
  cloudfront_bucket_name    = local.params_json.BUCKET_NAME
  cloudfront_origin_domain  = "${local.cloudfront_bucket_name}.s3.${var.aws_region}.amazonaws.com"
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

resource "aws_cloudfront_distribution" "s3mrmyhuang" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = ""
  price_class     = "PriceClass_All"
  http_version    = "http2"

  origin {
    domain_name = local.cloudfront_origin_domain
    origin_id   = local.cloudfront_origin_domain

    connection_attempts = 3
    connection_timeout  = 10

    s3_origin_config {
      origin_access_identity = ""
    }

  }

  default_cache_behavior {
    target_origin_id           = local.cloudfront_origin_domain
    viewer_protocol_policy     = "allow-all"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    smooth_streaming           = false
    cache_policy_id            = "4c04afaf-71c8-42b3-8059-3b4f85d9be23"
    origin_request_policy_id   = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
    response_headers_policy_id = "5cc3b908-e619-4b99-88e5-2cf7f45965bd"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
