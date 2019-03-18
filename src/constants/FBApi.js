/*global FB*/
import _ from 'lodash';

const MyFBLoginApp = (function () {
    let instance = {

    };

    const fbScriptId = 'fb-jssdk';
    const initLoginAppSetting = {
        appId: '1896046937300584',
        status: true,
        version: 'v3.2'
    };
    const TYPEOF_LOGINSTATUS = {
        'AUTH': 'connected',
        'EXPIRED': 'authorization_expired',
        'NEEDAUTH': 'not_authorized',
        'NONE': null
    },
    getProfile = function getProfile () {
        return new Promise((resolve)=>{
            FB.api('\me', {
                'fields': 'id,name',
            }, (response)=>{
                resolve(response);
            });
        });
    },
    doLogin = function doLogin () {
        return new Promise((resolve, reject)=> {
            FB.login((response)=>{
                let loginStatus = response.status;
                if(TYPEOF_LOGINSTATUS.AUTH === loginStatus) {
                    resolve(response);
                } else {
                    reject(response);
                }
            },{scope: 'id,name'});
        })
    },
    chkAuth = function () {
        return new Promise((resolve, reject)=> {
            if(typeof FB === 'undefined') {
                reject("FB not init!!");
            } else {
                FB.getLoginStatus((response)=>{
                    resolve(response);
                });                
            }
        })
    }    

    Object.defineProperties(instance, {
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
            'value': chkAuth,
        }
    });

    if(window) {
        window.fbAsyncInit = ()=>{
            if('undefined' !== typeof(FB)) {                        
                FB.init({
                    appId      : '1896046937300584',
                    version    : 'v3.2', 
                });
            };
        }
    }
    if(document) {
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