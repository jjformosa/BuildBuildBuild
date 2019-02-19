import _ from 'lodash';
import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import { 
    ACTIONTYPE_ACCOUNT_LOGINSUCCESS, 
    ACTIONTYPE_ACCOUNT_LOGINREJECT,
    ACTIONTYPE_ACCOUNT_AUTOLOGINREJECT,
    ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
    ACTIONTYPE_WAITING_START,
    ACTIONTYPE_WAITING_END,
    ACTIONTYPE_FLIPBOOK_SUCCESS,
    ACTIONTYPE_ILLUSTRATION_SUCCESS,
    ACTIONTYPE_JUMPTOPAGE,
    ACTIONTYPE_ILLUSTRATION_REJECT,
    ACTIONTYPE_ACCOUNT_ALLOWWEBCAM,
    ACTIONTYPE_ACCOUNT_DENYWEBCAM,
    ACTIONTYPE_UPDATECONTENTS_SUCCESS, 
    ACTIONTYPE_UPDATECONTENTS_REJECT
} from '../constants/actionTypes';

const accountReducer = handleActions({
    [ACTIONTYPE_ACCOUNT_LOGINSUCCESS]: (state, accountData) => {
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'step', 'webcam');
        _.assign(nextState, accountData);
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_LOGINREJECT]: (state, err) => {
        let nextState = _.cloneDeep(state),
            accountData = _.get(state, 'accountData');
        _.set(accountData, 'nextpathname', '/LandingPage/me');
        _.set(nextState, 'accountData', accountData);
        _.set(nextState, 'step', 'login');
        _.assign(nextState, err);
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_AUTOLOGINREJECT]: (state, err) => {
        let nextState = _.cloneDeep(state),
        accountData = _.get(state, 'accountData');
        _.set(accountData, 'nextpathname', '/LandingPage/me');
        _.set(nextState, 'step', 'login');
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_ALLOWWEBCAM]: (state) => {
        let nextState = _.cloneDeep(state),
            accountData = _.get(state, 'accountData');
        _.set(accountData, 'allowWebCam', true);
        _.set(nextState, 'step', 'go');
        _.set(nextState, 'accountData', accountData);
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_DENYWEBCAM]: (state) => {
        let nextState = _.cloneDeep(state),
            accountData = _.get(state, 'accountData');
        _.set(accountData, 'allowWebCam', true);
        _.set(nextState, 'step', 'go');
        _.set(nextState, 'accountData', accountData);
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_CHANGENICKNAME]: (state, accountData) => {
        let nextState = _.cloneDeep(state),
            nextpathname = '/LandingPage';
        if(_.has(state, 'accountData')) {
            nextpathname = '/WelcomePage/' + accountData.id;
        }
        _.assign(nextState, accountData, {
            'nextpathname': nextpathname,
        })
        return nextState;
    },
    [ACTIONTYPE_JUMPTOPAGE]: (state, {pathname, ...params}) => {
        let nextState = _.cloneDeep(state);
         _.assign(nextState, {'nextpathname': pathname});
         _.forEach(params, (_v, _k)=>{
             _.set(nextState, _k, _v);
         });
        return nextState;
    }
}, {'nextpathname': null,
    'accountData': {}
});

const storyReducer = handleActions({
    [ACTIONTYPE_FLIPBOOK_SUCCESS]: function(state, {type, response}) {
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'chps', response.contents);
        return nextState;
    },
    [ACTIONTYPE_ILLUSTRATION_SUCCESS]: function(state, {type, response}) {
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'illustrations', response);
        return nextState;
    },
    [ACTIONTYPE_ILLUSTRATION_REJECT]: function(state, {type, response}) {
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'illustrations', []);
        return nextState;
    },
    [ACTIONTYPE_UPDATECONTENTS_SUCCESS]: function(state, {type, contentid, newcontents, newillustrations}) {
        let nextState = _.cloneDeep(state);
        var newStory = {'chps': newcontents, 'illustrations': newillustrations};
        _.merge(nextState, newStory);
        return nextState;        
    }, 
    [ACTIONTYPE_UPDATECONTENTS_REJECT]: function(state, {type, err}) {

    }
}, {
    'chps': [],
    'illustrations': [],
});

const dataReducer = handleActions({
    [ACTIONTYPE_WAITING_START]: (state, command) => {
        console.log(command);
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'waiting', true);
        return nextState;
    },
    [ACTIONTYPE_WAITING_END] : (state, command) => {
        console.log(command);
        let nextState = _.cloneDeep(state);
        _.set(nextState, 'waiting', false);
        return nextState;
    } 
}, {'waiting': false});

const myAppReducer = combineReducers({accountReducer, storyReducer, dataReducer});

export default myAppReducer;