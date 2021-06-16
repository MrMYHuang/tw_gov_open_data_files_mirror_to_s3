const lib = require('./dist/fileMirroringToS3');

lib.fileMirroringToS3();

exports.handler = async (event) => {
    let response;
    try {
        await lib.fileMirroringToS3();
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
