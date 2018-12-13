import _ from 'lodash';
import {fetchStoryContent, fetchIllustrationContent} from './AWS';
import {ACTIONTYPE_WAITING_START} from '../../constants/actionTypes';
import {admin} from '../../constants/utility';

export const fetchStory = (storyId, accountData) => (dispatch) => {
  dispatch({
    'type': ACTIONTYPE_WAITING_START,
    'command': 'fetchStory'
  });
  if(storyId === accountData.id || _.has(admin, accountData.id)) {
    dispatch(fetchStoryContent(accountData));
  } else {
    dispatch(fetchStoryContent(accountData, ['share']));
  }
}

export const fetchIllustration = (storyId, accountData, illustrationId) => (dispatch) => {
  dispatch(fetchIllustrationContent(storyId, accountData, illustrationId));
} 