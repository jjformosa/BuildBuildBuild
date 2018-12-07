import _ from 'lodash';
import {DBFactory, InitAWS} from '../../constants/AWSApi';
import {
  ACTIONTYPE_ACCOUNT_LOGINSUCCESS, 
  ACTIONTYPE_ACCOUNT_LOGINREJECT,
  ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
  ACTIONTYPE_WAITING_END,
} from '../../constants/actionTypes';

export const getMyAccountData = (accountData) =>(dispatch)  =>  {
  InitAWS(accountData);
  DBFactory.getAccountDataByName(accountData).then((response)=>{
    dispatch({
      'type':ACTIONTYPE_ACCOUNT_LOGINSUCCESS,
      'accountData': response,
    })
  }, (err)=>{
    dispatch({
      'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
      'err': err,
    })
  }).finally(()=>{
    dispatch({
      'type': ACTIONTYPE_WAITING_END,
      'command': 'getMyAccountData'
    });
  });
};

export const setMyAccountNick = (accountData) =>(dispatch)  =>  {
  DBFactory.setMyAccountData(accountData).then((response)=>{
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