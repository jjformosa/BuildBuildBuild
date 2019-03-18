// import aws from 'aws-sdk';
/*global AWS*/
import _ from 'lodash';

let DBFactory = {};

let StorageFactory = {};

let InitAWS = null;
let isAWSInit = false;

const myAppRoleArn = 'arn:aws:iam::540052993261:role/facebookowner';

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
        _.has(value, 'N') ? Number.parseInt(_.get(value, 'N')): null;
        _.set(rtn, key, _v);
    });
    return rtn;
  }
}

const _module = (function(){
  let isInited = (document) ? null !== document.getElementById('aws-sdk'): false,
  myAppDB, myAppS3;

  InitAWS = function (a_Account) {
    if(isAWSInit) return;
    isAWSInit = true;
    myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    myAppS3 = new AWS.S3(makeAWSApiSetting2(a_Account.accessToken));
  //   AWS.config.region = 'us-east-1'; // 區域
  //   AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //       IdentityPoolId: 'us-east-1:020a3843-d4f8-4c36-a941-46b5a67447d6',
  //       Logins: {
  //         'graph.facebook.com': a_Account.accessToken,
  //       }
  //   });
  //   AWS.config.credentials.refresh(function (err) {
  //     if (err) return console.log("Error", err);
  //     console.log("Cognito Identity Id", AWS.config.credentials.identityId);
  // });
  //   myAppDB = new AWS.DynamoDB();
  //   myAppS3 = new AWS.S3();
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

  const createAccountData = function (a_Account) {
    if(!myAppDB) {
      myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    }
    return new Promise((resolve, reject)=>{
      if(!myAppDB) {
        reject(false, 'not init aws db');
      } else {
        let param = {
          'TableName':'myAccount',
          'Item': {
            'uid': {'S' :a_Account.id},
            'uname': {'S' :a_Account.name},
          },
          'ReturnValues': 'ALL_OLD'
        };
        myAppDB.putItem(param, (err, responseData)=>{
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

  const setAccountNick = function (a_data, a_Account) {
    if(!myAppDB) {
      myAppDB = new AWS.DynamoDB(makeAWSApiSetting(a_Account.accessToken));
    }
    return new Promise((resolve, reject) => {
      if(!myAppDB) {
        reject(false, 'not init aws db');
      } else {
        let param = {
          'TableName':'myAccount',
          'Key': {
            'uid': {'S' :a_data.uid},
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

  const getS3Object = function (a_key, a_eTag = null, a_Account = null) {
    if(!myAppS3) {
      myAppS3 = new AWS.DynamoDB(makeAWSApiSetting2(a_Account.accessToken));
    }
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        let param = {'Bucket': 'jjformosa-forlove10grams', 'Key': a_key};
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

  const headS3Object = function (a_key, a_Account) {
    if(!myAppS3) {
      myAppS3 = new AWS.DynamoDB(makeAWSApiSetting2(a_Account.accessToken));
    }
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        let param = {'Bucket': 'jjformosa-forlove10grams', 'Key': a_key};
        myAppS3.headObject(param, (err, data) => {
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

  const listFilesUnderFolder = function(a_path, a_Account) {
    if(!myAppS3) {
      myAppS3 = new AWS.DynamoDB(makeAWSApiSetting2(a_Account.accessToken));
    }
    return new Promise((resovle, reject) => {
      if(myAppS3) {
        myAppS3.listObjectsV2({
          'Bucket': 'jjformosa-forlove10grams',
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
  const putS3File = function putS3File(a_Key, a_Data, a_Account, {...props}) {
    if(!myAppS3) {
      myAppS3 = new AWS.DynamoDB(makeAWSApiSetting2(a_Account.accessToken));
    }
    let param = {
      'Bucket': 'jjformosa-forlove10grams',
      'Key': a_Key,
      'Body': a_Data
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
  DBFactory.setAccountNick = setAccountNick;
  DBFactory.createAccountData = createAccountData;

  StorageFactory.getS3Object = getS3Object;
  StorageFactory.headS3Object = headS3Object;
  StorageFactory.listFilesUnderFolder = listFilesUnderFolder;
  StorageFactory.putS3File = putS3File;
  return null;
}());

export {DBFactory, StorageFactory, InitAWS};