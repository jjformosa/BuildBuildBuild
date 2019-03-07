import { Enum_LoginIdentifyType } from '../../model/account';
import {facebookAutoLogin} from './FBAccount';
import {getMyAccountData, setMyAccountNick} from './AWS';
import {ACTIONTYPE_WAITING_START} from '../../constants/actionTypes';

export const accountLogin = (identifyType) => (dispatch) => {   
    dispatch({
        'type': ACTIONTYPE_WAITING_START,
        'command': 'accountLogin'
    }); 
    if(Enum_LoginIdentifyType.Facebook === identifyType) dispatch(facebookAutoLogin());
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
