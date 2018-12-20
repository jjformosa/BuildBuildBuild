import _ from 'lodash';
import {StorageFactory} from '../../constants/AWSApi';
import {ACTIONTYPE_FLIPBOOK_SUCCESS, ACTIONTYPE_FLIPBOOK_REJECT,
  ACTIONTYPE_ILLUSTRATION_SUCCESS, ACTIONTYPE_ILLUSTRATION_REJECT,
  ACTIONTYPE_WAITING_END} from '../../constants/actionTypes';
import {EncodeByteArrayToDataUrl} from '../../constants/utility';

export const fetchStoryContent = (accountData, path) => (dispatch) => {
  let key = 'facebook-' + accountData.id ;
  if(path) key += path.join('/');
  key += '/index.json';
  StorageFactory.getS3Object(key).then((awsData)=>{
    dispatch({
      'type': ACTIONTYPE_FLIPBOOK_SUCCESS,
      'response': JSON.parse(awsData.Body.toString('utf-8'))
    });
    dispatch({
      'type': ACTIONTYPE_WAITING_END,
      'command': 'fetchStoryContent',
    });
  }, (err)=>{
    dispatch({
      'type': ACTIONTYPE_FLIPBOOK_REJECT,
      err
    });
  });
}

export const fetchIllustrationContent = (storyId, accountData, illustrationId) => (dispatch) => {
  let path = (storyId === accountData.id) ? 'facebook-' + storyId +'/Albums/' + illustrationId :
    'facebook-' + storyId + '/Share/Albums/' + illustrationId ;
  StorageFactory.listFilesUnderFolder(path).then((array_awsData)=>{
    dispatch(handleFetchIllustrationContent(array_awsData));
  }, (err) => {
    dispatch({
      'type': ACTIONTYPE_ILLUSTRATION_REJECT,
      err
    });
  });
}

const handleFetchIllustrationContent = (listResult) => (dispatch) => {
  let array_awsData = _.filter(listResult, ({Key}) => {
    let _key = Key.toLowerCase();
    return _key.endsWith('.jpg') || _key.endsWith('.png');
  });
  Promise.all(_.map(array_awsData, function(awsData){
    return StorageFactory.getS3Object(decodeURIComponent(awsData.Key), awsData.ETag);
  })).then((response) => {
    dispatch({
      'type': ACTIONTYPE_ILLUSTRATION_SUCCESS,
      'response': _.map(response, function(awsData){
        let contentType = awsData.ContentType;
        return 'data:'+ contentType +';base64,' + EncodeByteArrayToDataUrl(awsData.Body);
      }),
    });
  }, (err) =>{
    dispatch({
      'type': ACTIONTYPE_ILLUSTRATION_REJECT,
      err
    });
  });
}