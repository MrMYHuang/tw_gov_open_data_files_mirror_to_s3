import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';
import axios from 'axios';
import params from './params.json';

const data = [
  { name: 'charge_station_list', url: 'https://www.gsp.gov.tw/iTaiwan/charge_station_list.csv' },
  { name: 'hotspotlist', url: 'https://itaiwan.gov.tw/downloads/zh-TW/hotspotlist.csv' },
];

const s3bucket = new AWS.S3({
  accessKeyId: params.IAM_USER_KEY,
  secretAccessKey: params.IAM_USER_SECRET
});

export async function downloadSource(url: string) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  if (res.status == 200) {
    return res.data;
  } else {
    throw `Download source error: ${res.statusText}`;
  }
}

async function uploadObjectToS3Bucket(objectName: string, objectData: any) {
  return new Promise<void>((ok, fail) => {
    const s3params: AWS.S3.PutObjectRequest = {
      Bucket: params.BUCKET_NAME,
      Key: objectName,
      Body: objectData,
      ACL: 'public-read'
    };
    s3bucket.upload(s3params, function (err: Error, data: { Location: any; }) {
      if (err) {
        fail(err);
        return;
      }

      ok();
    });
  });
}

export async function fileMirroringToS3() {
  for (let i = 0; i < data.length; i++) {
    try {
      const datum = data[i];
      const downloadData = await downloadSource(datum.url);
      const zip = new AdmZip();
      zip.addFile(datum.name, downloadData);
      await uploadObjectToS3Bucket(`${datum.name}.zip`, zip.toBuffer());
      console.log(`File mirroring success!`);
    } catch (err) {
      console.error(`File mirroring failed: ` + err);
    }
  }
}
