/*global FB*/
import _ from 'lodash';

const MyFBLoginApp = (function () {
    let instance = {

    };

    const initLoginAppSetting = {
        appId: '1896046937300584',
        status: true,
        version: 'v3.2'
    };

    const fbScriptId = 'fb-jssdk';

    const TYPEOF_LOGINSTATUS = {
        'AUTH': 'connected',
        'EXPIRED': 'authorization_expired',
        'NEEDAUTH': 'not_authorized',
        'NONE': null
    }

    let isInited = false,
        lastErrMsg = null;

    let getLastErrMsg = function getLastErrMsg() {
        return lastErrMsg;
    },
    resetApp = function resetApp() {
        lastErrMsg = null;
    },
    chkErr = function chkErr () {
        return (null === lastErrMsg);
    },
    getProfile = function getProfile () {
        return new Promise((resolve)=>{
            FB.api('\me', (response)=>{
                resolve(response);
            });
        });
    },
    doLogin = function doLogin () {
        return new Promise((resolve, reject)=> {
            FB.login((response)=>{
                let loginStatus = response.status;
                if(TYPEOF_LOGINSTATUS.AUTH === loginStatus) {
                    resolve({loginStatus, ...response});
                } else {
                    reject(loginStatus, response);
                }
            });
        })
    },
    chkAuth = function () {
        return new Promise((resolve, reject)=> {
            FB.getLoginStatus((response)=>{
                let loginStatus = response.status;
                if(TYPEOF_LOGINSTATUS.AUTH === loginStatus) {
                    resolve(loginStatus);
                } else {
                    reject(loginStatus);
                }
            });
        })
    }    

    Object.defineProperties(instance, {
        'reset': {
            'value': resetApp,
        },
        'getinitLoginAppSetting': {
            'get': function() {
                return _.cloneDeep(initLoginAppSetting);
            }
        },
        'getProfile': {
            'value': getProfile,
        },
        'doLogin': {
            'value': doLogin,
        },
        'chkAuth': {
            'chkAuth': chkAuth,
        }
    });

    if(window && !isInited) {
        window.fbAsyncInit = ()=>{
            if('undefined' !== typeof(FB)) {                        
                FB.init({
                    appId      : initLoginAppSetting.appId,
                    version    : 'v3.2', 
                });
                isInited = true;
            };
        }
    }
    if(document && !isInited) {
        let fbScript = document.getElementById(fbScriptId);
        if(!fbScript) {
            fbScript = document.createElement('SCRIPT');
            fbScript.id = fbScriptId;
            fbScript.src = 'https://connect.facebook.net/en_US/sdk.js';
            document.head.appendChild(fbScript);
        }
    }

    return instance;
}());

export default MyFBLoginApp;