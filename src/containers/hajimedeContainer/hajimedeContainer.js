import {connect} from 'react-redux';
import _ from 'lodash';
import HaJiMeDePage from '../../components/hajimedePage/hajimedePage';
import {setAccountNick} from '../../actions/account/account';

export default connect(
  (state) =>  ({
  'accountData': _.get(state, 'accountReducer.accountData'),
  'nextpathname': _.get(state, ['accountReducer', 'nextpathname']),
}), (dispatch) => ({
  'onNickConfirm' : function(evt, props, ...args) {
    dispatch(setAccountNick(props.accountData));
  }
}))(HaJiMeDePage);