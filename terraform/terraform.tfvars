aws_region           = "ap-east-2"
lambda_function_name = "MirroringTwOpenDataToS3"
lambda_role_arn      = "arn:aws:lambda:ap-east-2:513539428904:function:MirroringTwOpenDataToS3"
lambda_zip_path      = "../a.zip"

lambda_role_name   = "MirroringTwOpenDataToS3-role"
create_lambda_role = true
# If you want to use an existing role instead:
#create_lambda_role = false

enable_schedule    = true
schedule_expression = "cron(0 16 * * ? *)"

tags = {
  Project = "tw_gov_open_data_files_mirror_to_s3"
}
