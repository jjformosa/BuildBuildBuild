
import {updateStoryContents} from './AWS';
import {ACTIONTYPE_WAITING_START} from '../../constants/actionTypes'

export const updateStory = (accountData, newContents, newIllustrations) => (dispatch) => {  
  dispatch({
      'type': ACTIONTYPE_WAITING_START,
      'command': 'updateStory'
  }); 
  dispatch(updateStoryContents(accountData, newContents, newIllustrations));
}