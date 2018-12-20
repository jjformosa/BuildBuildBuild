import {connect} from 'react-redux';
import { withRouter } from "react-router";
import _ from 'lodash';
import MemoryBook from '../../components/memoryBook/memoryBook';
import {fetchStory, fetchIllustration} from '../../actions/memoryBook/memoryBook';
import { ACTIONTYPE_JUMPTOPAGE } from '../../constants/actionTypes';

const initState = {
  'accountData': {
    'id': null,
    'name': null,
  }, 
  'chps': [''],
  'illustrations': [],
}

export default withRouter(connect(
  (state) => {
    let nextState = _.cloneDeep(initState);
    let accountData = state.accountReducer.accountData;
      _.set(nextState, 'accountData', _.cloneDeep(accountData));
    let chps = state.storyReducer.chps;
      _.set(nextState, 'chps', _.cloneDeep(chps));
    let illustrations = state.storyReducer.illustrations;
      _.set(nextState, 'illustrations', illustrations);
    if(state.storyReducer.page) _.set(nextState, 'page', state.storyReducer.page);
    else if(accountData.storyPage) _.set(nextState, 'page', accountData.storyPage);
    return nextState;
  },
  (dispatch) => ({
    'fetchStory': function(storyId, accountData, ...args) {
      
      dispatch(fetchStory(storyId, accountData, {...args}));
    },
    'fetchIllustration': function(storyId, accountData, illustrationId) {
      //let storyId = isNullOrUndefined(storyOwnerId) ? accountData.id : storyOwnerId;
      dispatch(fetchIllustration(storyId, accountData, illustrationId));
    },
    'jumpToPage' : function({pathname, ...args}) {
      dispatch({
        'type': ACTIONTYPE_JUMPTOPAGE,
        'pathname': pathname,
        ...args
      });
    }
  })
)(MemoryBook));