import _ from 'lodash';
import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import { 
    ACTIONTYPE_ACCOUNT_LOGINSUCCESS, 
    ACTIONTYPE_ACCOUNT_LOGINREJECT,
    ACTIONTYPE_ACCOUNT_CHANGENICKNAME,
    ACTIONTYPE_WAITING_START,
    ACTIONTYPE_WAITING_END,
    ACTIONTYPE_FLIPBOOK_SUCCESS,
    ACTIONTYPE_ILLUSTRATION_SUCCESS,
    ACTIONTYPE_JUMPTOPAGE,
    ACTIONTYPE_ILLUSTRATION_REJECT,
} from '../constants/actionTypes';

const accountReducer = handleActions({
    [ACTIONTYPE_ACCOUNT_LOGINSUCCESS]: (state, accountData) => {
        let nextState = _.cloneDeep(state),
            nextpathname = '/WelcomePage';
        if(!_.get(accountData, 'accountData.nick')) {
            nextpathname = '/HaJiMeDePage';
        }
        _.assign(nextState, accountData, {
            'nextpathname': nextpathname,
        });
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_LOGINREJECT]: (state, err) => {
        let nextState = _.cloneDeep(state);
        _.assign(nextState, err);
        return nextState;
    },
    [ACTIONTYPE_ACCOUNT_CHANGENICKNAME]: (state, accountData) => {
        let nextState = _.cloneDeep(state),
            nextpathname = '/LandingPage';
        if(_.has(state, 'accountData')) {
            nextpathname = '/WelcomePage';
        }
        _.assign(nextState, accountData, {
            'nextpathname': nextpathname,
        })
        return nextState;
    },
    [ACTIONTYPE_JUMPTOPAGE]: (state, params) => {
        let nextState = _.cloneDeep(state);
         _.assign(nextState, {'nextpathname': params.pathname});
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
}, {
    'waiting': false})

const myAppReducer = combineReducers({accountReducer, storyReducer, dataReducer});

export default myAppReducer;