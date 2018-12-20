import _ from 'lodash';
import {StorageFactory} from '../../constants/AWSApi';
import { isNullOrUndefined } from 'util';
import {onUpdateStorySuccess, onUpdateStoryFail} from './webcam';

export const updateStoryContents = (accountData, a_id, newContents, illustrations) => (dispatch)=> {  
  //先更新contents
  let indexFileKey = 'facebook-' + accountData.id + '/index.json',
  // let indexFileKey = 'facebook-2434715163221202/index_2.josn',
    jsonContent = {'contents': newContents};
  StorageFactory.putS3File(indexFileKey, JSON.stringify(jsonContent)).then((awsData)=>{
    if(isNullOrUndefined(illustrations)) {
      dispatch(onUpdateStorySuccess(accountData, a_id, newContents));
    } else {
      //再更新相簿
      dispatch(updateStoryIllustrations(accountData, a_id, newContents, illustrations));
    }
  }).catch((err)=>{
    dispatch(onUpdateStoryFail(err, accountData, a_id, newContents));
  });
}

export const updateStoryIllustrations = (accountData, a_id, newContents, illustrations) => (dispatch) => {
  let root = ['facebook-' + accountData.id, 'Albums', a_id].join('/');
  //let root = 'facebook-2434715163221202/Albums/2/';
  let _all = Promise.all(_.map(illustrations, (illustration) => {
    let _path = root + '/' + illustration.filename;
    return StorageFactory.putS3File(_path, illustration.body, {
      'ContentType': illustration.contenttype
    });
  }));
  _all.then(array_AWSDatas=>{
    dispatch(onUpdateStorySuccess(accountData, a_id, newContents, illustrations));
  }).catch(err=>{
    dispatch(onUpdateStoryFail(err, accountData, a_id, newContents, illustrations));
  });
}