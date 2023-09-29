import { SnotifyToast } from '../models/snotify-toast.model';

/**
 * Notifications object
 */
export interface SnotifyNotifications {
  leftTop?: SnotifyToast[];
  leftCenter?: SnotifyToast[];
  leftBottom?: SnotifyToast[];

  rightTop?: SnotifyToast[];
  rightCenter?: SnotifyToast[];
  rightBottom?: SnotifyToast[];

  centerTop?: SnotifyToast[];
  centerCenter?: SnotifyToast[];
  centerBottom?: SnotifyToast[];
}
