import _ from 'lodash';
import {fetchStoryContent, fetchIllustrationContent} from './AWS';
import {ACTIONTYPE_WAITING_START} from '../../constants/actionTypes';

export const fetchStory = (accountData, toNum) => (dispatch) => {
  dispatch({
    'type': ACTIONTYPE_WAITING_START,
    'command': 'fetchStory'
  });
  dispatch(fetchStoryContent(accountData, toNum));
}

export const fetchIllustration = (accountData, illustrationId) => (dispatch) => {
  dispatch(fetchIllustrationContent(accountData, illustrationId));
} 