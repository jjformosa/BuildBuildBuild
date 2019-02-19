import _ from 'lodash';
import MyFBLoginApp from '../../constants/FBApi';
import {ACTIONTYPE_ACCOUNT_LOGINREJECT, ACTIONTYPE_ACCOUNT_LOGOUT, ACTIONTYPE_ACCOUNT_AUTOLOGINREJECT} from '../../constants/actionTypes';
import {Enum_LoginIdentifyType} from '../../model/account';
import {getMyAccount} from './account';

export const facebookLogin = () => (dispatch) => {
    MyFBLoginApp.doLogin().then(({status, ...response}) => {
        if('connected' === status) {
            let accesstoken = response.authResponse.accessToken;
            dispatch(facebookGetProfile(accesstoken));
        }
    }, () => {
        dispatch({
            'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
            'msg' : 'login by facebook fail!!',
        });
    });
}
export const facebookChkStatus = () => (dispatch) => {
    MyFBLoginApp.chkAuth().then(({status, ...response}) => {
        if('connected' === status) {
            let accesstoken = response.authResponse.accessToken;
            dispatch(facebookGetProfile(accesstoken));
        } else {
            dispatch({
                'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
                'msg' : 'need facebook application permission!!',
            });
        }
    }, () => {
        dispatch({
            'type': ACTIONTYPE_ACCOUNT_LOGINREJECT,
            'msg' : 'login by facebook fail!!',
        });
    }); 
}
export const facebookGetProfile = (accessToken) => (dispatch) => {
    MyFBLoginApp.getProfile().then((response) => {
        let rtn = _.cloneDeep(response);
        _.assign(rtn, {
            'accessToken': accessToken,
            'identifyType': Enum_LoginIdentifyType.Facebook,
        });
        dispatch(getMyAccount(rtn));
    });
}
export const facebookLogout = () => (dispatch) => {
    let success = true;
    MyFBLoginApp.logout().finally(()=>{
        dispatch({
            'type': ACTIONTYPE_ACCOUNT_LOGOUT,
            success
        });
    });
}
export const facebookAutoLogin = () => (dispatch) => {
    MyFBLoginApp.chkAuth().then(({status, ...response}) => {
        if('connected' === status) {
            let accesstoken = response.authResponse.accessToken;  
            return Promise.all(new Promise((resolve) => {resolve(accesstoken)}), MyFBLoginApp.getProfile());
        } else {
            dispatch({
                'type': ACTIONTYPE_ACCOUNT_AUTOLOGINREJECT,
                'msg' : 'need facebook application permission!!',
            });
            return null;
        }
    }).then((accessToken, response) => {
        let rtn = _.cloneDeep(response);
        _.assign(rtn, {
            'accessToken': accessToken,
            'identifyType': Enum_LoginIdentifyType.Facebook,
        });
        dispatch(getMyAccount(rtn));
    }).catch(err=>{
        dispatch({
            'type': ACTIONTYPE_ACCOUNT_AUTOLOGINREJECT,
            'msg' : 'login by facebook fail!!',
        });
    });     
}