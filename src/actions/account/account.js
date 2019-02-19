import { Enum_LoginIdentifyType } from '../../model/account';
import {facebookLogin, facebookAutoLogin} from './FBAccount';
import {getMyAccountData, setMyAccountNick} from './AWS';
import {ACTIONTYPE_WAITING_START} from '../../constants/actionTypes';

export const autoLogin = (id) => (dispatch) => {  
    dispatch({
        'type': ACTIONTYPE_WAITING_START,
        'command': 'autoLogin'
    }); 
    dispatch(facebookAutoLogin(id));
}

export const accountLogin = (identifyType) => (dispatch) => {   
    dispatch({
        'type': ACTIONTYPE_WAITING_START,
        'command': 'accountLogin'
    }); 
    if(Enum_LoginIdentifyType.Facebook === identifyType) dispatch(facebookLogin());
}

export const getMyAccount = (accountData) => (dispatch) => {
    dispatch({
        'type': ACTIONTYPE_WAITING_START,
        'command': 'getMyAccount'
    });
    dispatch(getMyAccountData(accountData));
}

export const setAccountNick = (accountData) => (dispatch) => {
    dispatch({
        'type': ACTIONTYPE_WAITING_START,
    });
    dispatch(setMyAccountNick(accountData));
}
