import { connect } from 'react-redux';
import _ from 'lodash';
import LandingPage from '../../components/landingPage/landingPage';
import {accountLogin} from '../../actions/account/account';

export default connect(
    (state) => {
        let rtn = {};
        _.set(rtn,'nextpathname',_.get(state, ['accountReducer', 'nextpathname']));
        return rtn;
    },
    (dispatch)=>({
        'onBtnLoginClick': (evt, props, ...args) => {
            dispatch(accountLogin(props.identifyType));
        }
    })
    )(LandingPage);