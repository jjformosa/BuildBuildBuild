import _ from 'lodash';
import {StorageFactory} from '../../constants/AWSApi';
import {ACTIONTYPE_UPDATECONTENTS_SUCCESS, ACTIONTYPE_UPDATECONTENTS_REJECT,
  ACTIONTYPE_UPDATEILLUSTRATION_SUCCESS, ACTIONTYPE_UPDATEILLUSTRATION_REJECT,
  ACTIONTYPE_WAITING_END} from '../../constants/actionTypes';
import {EncodeByteArrayToDataUrl} from '../../constants/utility';
import { isNullOrUndefined } from 'util';

export const updateStoryContents = (accountData, newContents, illustrations) => (dispatch)=> {
  //先更新contents
  let indexFileKey = 'facebook-' + accountData.id + '/index.json';
  StorageFactory.putS3File(indexFileKey, newContents).then((awsData)=>{
    if(isNullOrUndefined(illustrations)) {
      dispatch({
        'type': ACTIONTYPE_UPDATECONTENTS_SUCCESS,
        awsData,
      });
    } else {
      //再更新相簿
      dispatch(updateStoryIllustrations(accountData, illustrations));
    }
  }, (err)=>{
    dispatch({
      'type': ACTIONTYPE_UPDATECONTENTS_REJECT,
      err
    });
  });
}

export const updateStoryIllustrations = (accountData, illustrations, watiForAll = false) => (dispatch) => {
  let keys = _.keys(illustrations);
  if(1 < keys.length) {
    Promise.all(_.map(illustrations, a_illustrationData =>{
      return updateStoryIllustrations(accountData, a_illustrationData, true);
    })).then((array_awsData)=>{
      dispatch({
        'type': ACTIONTYPE_UPDATEILLUSTRATION_SUCCESS,
        'result': array_awsData, // {Key, ETag}
      });
    }, (err, illustration)=>{
      dispatch({
        'type': ACTIONTYPE_UPDATEILLUSTRATION_REJECT,
        illustration,
        err
      })
    });
  } else if(1 === keys.length) {    
    let illustration = _.get(illustrations, keys[0]);
    let p1 = makeSureFolderExist(accountData, keys[0]);
    let p2 = p1.then(()=>{
        return Promise.all(_.map(illustration, imgData=>{
          return StorageFactory.putS3File(imgData.filename, imgData.blob);
        }));
      }, (err)=>{
        dispatch({
          'type': ACTIONTYPE_UPDATEILLUSTRATION_REJECT,
          illustration,
          err,
        });
        return null;
      });
  }
}

const cureateFolder = async (accountData, name) => {
  let folderKey = 'faceebok-' + accountData.id + '/' + name + '/';
  let isExist = await StorageFactory.isObjectExist(folderKey);
  if(!isExist) {
    try{
    await StorageFactory.putS3Folder(folderKey);
    } catch{
      isExist = false;
    }
  }
  return isExist;
}

const makeSureFolderExist = (accountData, name) => {
  let folderKey = 'facebook-' + accountData.id + '/' + name + '/';
  let p1 = StorageFactory.isObjectExist(folderKey).then(({isExist})=> {
    if(!isExist) {
      return StorageFactory.putS3Folder(folderKey);
    } else {
      return Promise.resolve(folderKey);
    }
  }, (err)=>{
    return Promise.reject(err);
  });
  console.log(p1);
  return p1;
}