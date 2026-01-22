import { getApiClient } from './apiAuth';
import CryptoJS from 'crypto-js';
import { secretKey } from '../constants';

interface ActivityPayload {
  activityType?: string;
  subjectId?: string;
}

/**
 * Track student activity
 * Only one of activityType, subjectId, or projectId should be provided
 * Others will be set to empty string
 * 
 * @example
 * trackActivity({ activityType: ACTIVITY_TYPE.TICKET })
 * trackActivity({ subjectId: 'py' })
 * trackActivity({ projectId: '10' })
 */
export const trackActivity = async (payload: ActivityPayload): Promise<void> => {
  try {
    // Get student_id from sessionStorage
    const encryptedStudentId = sessionStorage.getItem('StudentId');
    if (!encryptedStudentId) {
      console.warn('StudentId not found in sessionStorage');
      return;
    }

    const studentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);

    // Build payload - only one field will be populated, others are empty strings
    const apiPayload = {
      student_id: studentId,
      subject_id: payload.subjectId || '',
      activity_type: payload.activityType || '',
    };

    // Call the activity API
    await getApiClient().post(
      `${process.env.REACT_APP_BACKEND_URL}api/student/activity/`,
      apiPayload
    );
  } catch (error) {
    // Silently fail - don't interrupt user flow
    console.error('Error tracking activity:', error);
  }
};
