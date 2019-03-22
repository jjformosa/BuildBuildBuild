import {connect} from 'react-redux';
import _ from 'lodash';
import WelcomePage from '../../components/welcomePage/welcomePage';
import {ACTIONTYPE_JUMPTOPAGE} from '../../constants/actionTypes';

export default connect((state)=>({
  'accountData': _.get(state, ['accountReducer', 'accountData']),
  'nextpathname': _.get(state, ['accountReducer', 'nextpathname']),
}),  (dispatch)=>({
  'startMemo': function(evt, accountData) {
    dispatch({
      'type': ACTIONTYPE_JUMPTOPAGE,
      'pathname': '/MemoryBook/' + accountData.id + '/0',
    });
  },
  'startShare': function(evt, accountData) {
    dispatch({
      'type': ACTIONTYPE_JUMPTOPAGE,
      'pathname': '/MemoryBook/share/0',
    });
  },
}))(WelcomePage);