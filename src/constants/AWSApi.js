// import aws from 'aws-sdk';
/*global AWS*/
import _ from 'lodash';

let DBFactory = {};

let StorageFactory = {};

let InitAWS = null;

const myAppRoleArn = 'arn:aws:iam::540052993261:role/jjformosatest';

const makeAWSApiSetting = (a_accessToken) =>(
  {
    'credentials': new AWS.WebIdentityCredentials({
      'ProviderId': 'graph.facebook.com',
      'RoleArn': myAppRoleArn,
      'WebIdentityToken':a_accessToken,
    })
  });
const makeAWSApiSetting2 = (a_accessToken) =>(
    {
      'credentials': new AWS.WebIdentityCredentials({
        'ProviderId': 'graph.facebook.com',
        'RoleArn': myAppRoleArn,
        'WebIdentityToken':a_accessToken,
      }),
      'region': 'us-east-2'
  });

const decodeDynamoDBItem = function (a_Item) {
  if(!a_Item) {
    return null;
  } else {
    let rtn = {};
    _.each(a_Item, (value, key) => {
      let _v = _.has(value, 'S') ? _.get(value, 'S') : 
        _.has(value, 'N') ? _.get(value, 'N'): null;
        _.set(rtn, key, _v);
    });
    return rtn;
  }
}

const _module = (function(){
  let isInited = (document) ? null !== document.getElementById('aws-sdk'): false,
  myAppDB, myAppS3, customerDB, customerS3;

  InitAWS = function (a_Account) {
    myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    myAppS3 = new AWS.S3(makeAWSApiSetting2(a_Account.accessToken));
  }

  const initMyAWSApi = function() {
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:25fd6e5d-d71c-47b6-a90d-508dbbdc9309',
    });
  }
  const getAccountData = function (a_Account) {
    if(!myAppDB) {
      myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    }
    return new Promise((resolve, reject) => {
      if(!myAppDB) {
        reject(false, 'not init aws db');
      } else {
        myAppDB.getItem({
          'Key': {
            'uid': {
              'S': a_Account.id,
            },
            'uname': {
              'S': a_Account.name
            }
          },
          'TableName': 'myAccount'
        }, (err, responseData)=>{
          if(err) {
            reject(err);
          } else {
            let rtn = decodeDynamoDBItem(responseData.Item);
            _.merge(rtn, a_Account);
            resolve(rtn);
          }
        });
      }
    });
  }

  const getAccountDataByName = function (a_Account) {
    if(!myAppDB) {
      myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    }
    return new Promise((resolve, reject) => {
      if(!myAppDB) {
        reject(false, 'not init aws db');
      } else {
        myAppDB.scan({
          FilterExpression: "#uname = :name or #uid = :uid",
          ExpressionAttributeNames: {
            "#uname": "uname",
            "#uid": "uid"
          },
          ExpressionAttributeValues: {
            ":name":{'S': a_Account.name},
            ":uid": {'S': a_Account.id},
          },
          'Select':'ALL_ATTRIBUTES',
          'TableName': 'myAccount'
        }, (err, responseData)=>{
          if(err) {
            reject(err);
          } else {
            let rtn = decodeDynamoDBItem(responseData.Items[0]);
            _.merge(rtn, a_Account);
            resolve(rtn);
          }
        });
      }
    });
  }

  const setAccountData = function (a_data) {
    return new Promise((resolve, reject) => {
      if(!myAppDB) {
        reject(false, 'not init aws db');
      } else {
        let param = {
          'TableName':'myAccount',
          'Key': {
            'uid': {'S' :a_data.id},
            'uname': {'S' :a_data.name},
          },
          'UpdateExpression': 'set nick = :nick',
          'ExpressionAttributeValues': {
            ':nick': {'S' :a_data.nick}
          },
          'ReturnValues': 'ALL_NEW'
        };
        myAppDB.updateItem(param, (err, responseData)=>{
          if(err) {
            reject(err);
          } else {
            let rtn = decodeDynamoDBItem(responseData.Attributes);
            resolve(rtn);
          }
        });
      }
    });
  }

  const getS3Object = function (a_key, a_eTag = null) {
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        let param = {'Bucket': 'jjformosatest', 'Key': a_key};
        if(a_eTag) {
          _.set(param, 'IfMatch', a_eTag);
        }
        myAppS3.getObject(param, (err, data) => {
          if(err) {
            reject(err);
          } else {
            resovle(data);
          }
        })
      } else {
        reject ("getS3Object: S3 not init!");
      }
    });
  }

  const listFilesUnderFolder = function(a_path) {
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        myAppS3.listObjectsV2({
          'Bucket': 'jjformosatest',
          'Prefix': a_path + '/',
          'EncodingType': 'url'
        }, (err, data) => {
          if(err) {
            reject(err);
          } else {
            let rtn = _.map(data.Contents, (a_content) => {
              return {
                'Key': a_content.Key,
                'ETag': a_content.ETag
              }
            });
            // _.forEach(data.Contents, (a_content, a_index) => {
            //   rtn[a_index] = {
            //     'Key': a_content.Key,
            //     'ETag': a_content.ETag
            //   }
            // }); 
            resovle(rtn);
          }
        })
      } else {
        reject ("listFilesUnderFolder: S3 not init!");
      }
    });
  }
  const putExtendParams = ['ContentType'];
  const putS3File = function putS3File(a_Key, a_Data, {...props}) {
    let param = {
      'Bucket': 'jjformosatest',
      'Key': a_Key,
      'Body': a_Data,
      'ACL': 'authenticated-read',
    };
    _.forEach(props, (_v, _k)=>{
      if(_.has(putExtendParams, _k)) {
        _.set(param, _k, _v);
      }
    });
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        myAppS3.putObject(param, (err, data) => {
          if(err) {
            reject(err);
          } else {
            let rtn = _.map(data.Contents, (a_content) => {
              return {
                'Key': a_Key,
                'ETag': a_content.ETag
              }
            });
            resovle(rtn);
          }
        })
      } else {
        reject ("putS3Obecjt: S3 not init!");
      }
    });
  }

  if(document && !isInited) {
    let awsScript = document.createElement('SCRIPT');
    awsScript.src = 'https://sdk.amazonaws.com/js/aws-sdk-2.283.1.min.js';
    awsScript.onload = initMyAWSApi;
    awsScript.id = 'aws-sdk';
    document.head.appendChild(awsScript);
  }
  
  DBFactory.getMyAccountData = getAccountData;
  DBFactory.getAccountDataByName = getAccountDataByName;
  DBFactory.setMyAccountData = setAccountData;

  StorageFactory.getS3Object = getS3Object;
  StorageFactory.listFilesUnderFolder = listFilesUnderFolder;
  StorageFactory.putS3File = putS3File;
  return null;
}());

export {DBFactory, StorageFactory, InitAWS};