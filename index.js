import { fileMirroringToS3 } from './dist/fileMirroringToS3.js';

// For Amazon AWS Lambda.
export const handler = async () => {
  let response;
  try {
      await fileMirroringToS3();
      response = {
          statusCode: 200,
          body: JSON.stringify('Success!'),
      };
  } catch(err) {
      response = {
          statusCode: 400,
          body: JSON.stringify(`Error! ${err}`),
      };        
  }
  return response;
};
