import {DBFactory, StorageFactory, InitAWS} from '../../constants/AWSApi';
import {
  ACTIONTYPE_ACCOUNT_LOGINSUCCESS, 
  ACTIONTYPE_ACCOUNT_LOGINREJECT,
  ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
  ACTIONTYPE_WAITING_END,
} from '../../constants/actionTypes';

export const getMyAccountData = (account) =>(dispatch)  =>  {
  InitAWS(account);
  DBFactory.getMyAccountData(account).then((accountData)=>{
    if(!accountData) {
      dispatch(createAccountData(account));
    } else {
      dispatch({
          'type':ACTIONTYPE_ACCOUNT_LOGINSUCCESS,
          accountData,
      });
    }
  }, (err)=>{
    dispatch({
      'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
      'err': err,
    });
  }).finally(()=>{
    dispatch({
      'type': ACTIONTYPE_WAITING_END,
      'command': 'getMyAccountData'
    });
  });
};

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
  let indexFileKey = 'facebook-' + account.id + '/index.json';
  StorageFactory.putS3File(indexFileKey, JSON.stringify({'contents': []})).then(()=>{
    dispatch(getMyAccountData(account));
  }).catch(err=>{
    dispatch({
      'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
      'err': err,
    });
  });
}

export const setMyAccountNick = (accountData) =>(dispatch)  =>  {
  DBFactory.setAccountNick(accountData).then((response)=>{
    dispatch({
      'type':ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
      'accountData': response,
    })
  }, (err)=>{
    console.log(err);
  });
  dispatch({
    'type': ACTIONTYPE_WAITING_END
  })
};