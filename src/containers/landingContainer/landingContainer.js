import { connect } from 'react-redux';
import _ from 'lodash';
import LandingPage from '../../components/landingPage/landingPage';
import {accountLogin} from '../../actions/account/account';
import { Enum_LoginIdentifyType } from '../../model/account';
import {
    ACTIONTYPE_ACCOUNT_DENYWEBCAM, 
    ACTIONTYPE_ACCOUNT_ALLOWWEBCAM,
    ACTIONTYPE_JUMPTOPAGE} from '../../constants/actionTypes';

export default connect(
    (state) => {
        let rtn = {};
        let accountReducer = _.get(state, 'accountReducer'),
            step = _.has(accountReducer, 'step')? _.get(accountReducer, 'step') : 'login';
        _.set(rtn,'nextpathname',_.get(accountReducer, 'nextpathname'));
        _.set(rtn,'accountData', _.get(accountReducer, 'accountData'));
        _.set(rtn, 'step', step);
        return rtn;
    },
    (dispatch)=>({
        'onBtnLoginClick': (evt) => {
            dispatch(accountLogin(Enum_LoginIdentifyType.Facebook));
        },
        'onBtnAllowWebCamClick': evt=> {
            dispatch({
                'type': ACTIONTYPE_ACCOUNT_ALLOWWEBCAM,
            });
        },
        'onBtnDenyWebCamClick': evt => {
            dispatch({
                'type': ACTIONTYPE_ACCOUNT_DENYWEBCAM,
            });
        },
        'onBtnGoClick': (evt, accountData) => {
            let nextpathname = '/WelcomePage/' + accountData.id;
            if(!_.get(accountData, 'nick')) {
                nextpathname = '/HaJiMeDePage/' + accountData.id;
            }
            dispatch({
                'type': ACTIONTYPE_JUMPTOPAGE,
                'pathname': nextpathname
            });
        }
    })
    )(LandingPage);