import {DBFactory, StorageFactory, InitAWS} from '../../constants/AWSApi';
import _ from 'lodash';
import {
  ACTIONTYPE_ACCOUNT_LOGINSUCCESS, 
  ACTIONTYPE_ACCOUNT_LOGINREJECT,
  ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
  ACTIONTYPE_WAITING_END,
} from '../../constants/actionTypes';

export const getMyAccountData = (account) => (dispatch) => {
  InitAWS(account);
  setTimeout(function(){
    DBFactory.getMyAccountData(account).then((accountData)=>{
      if(!accountData) {
        dispatch(createAccountData(account));
      } else {
        dispatch(headAccountStoryAfterGetMyAccountData(accountData));
      }
    }, (err)=>{
      dispatch({
        'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
        'err': err,
      });
      dispatch({
        'type': ACTIONTYPE_WAITING_END,
        'command': 'getMyAccountData'
      });
    });}, 1000);
};

const headAccountStoryAfterGetMyAccountData = (accountData) => (dispatch) => {
  let path = 'facebook-' + accountData.id + '/index.json';
  StorageFactory.headS3Object(path, accountData).then(
    () => {
      _.set(accountData, 'storyReady', true);
    }, 
    () => {
      _.set(accountData, 'storyReady', false);
    }
  ).finally(()=>{
      dispatch({
        'type':ACTIONTYPE_ACCOUNT_LOGINSUCCESS,
        accountData
      });
      dispatch({
        'type': ACTIONTYPE_WAITING_END,
        'command': 'getMyAccountData'
      });
    },
  );
}

const createAccountData = (accout) => (dispatch) => {
  DBFactory.createAccountData(accout).then((_)=>{
    dispatch(createAccountRoot(accout));
  }).catch((err)=>{
    dispatch({
      'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
      'err': err,
    });
  });
}

const createAccountRoot = (account)=> (dispatch) => {  
  let indexFileKey = 'facebook-' + account.id +'/visite.json';
  StorageFactory.putS3File(indexFileKey, JSON.stringify({'contents': []}), account).then(()=>{
    dispatch(getMyAccountData(account));
  }).catch(err=>{
    dispatch({
      'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
      'err': err,
    });
  });
}

export const setMyAccountNick = (accountData) =>(dispatch)  =>  {
  DBFactory.setAccountNick(accountData, accountData).then((response)=>{
    dispatch({
      'type':ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
      accountData,
    })
  }, (err)=>{
    console.log(err);
  });
  dispatch({
    'type': ACTIONTYPE_WAITING_END
  })
};