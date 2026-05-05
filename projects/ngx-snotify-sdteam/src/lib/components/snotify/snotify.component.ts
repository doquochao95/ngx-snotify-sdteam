import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { SnotifyService } from '../../services/snotify.service';
import { SnotifyToast } from '../../models/snotify-toast.model';
import { Subscription } from 'rxjs';
import { SnotifyNotifications } from '../../interfaces/snotify-notifications.interface';
import { SnotifyPosition } from '../../enums/snotify-position.enum';
import { SnotifyEventType } from '../../types/snotify-event.type';

@Component({
  selector: 'ng-snotify',
  templateUrl: './snotify.component.html',
  encapsulation: ViewEncapsulation.None
})
export class SnotifyComponent implements OnInit, OnDestroy {
  /**
   * Toasts array
   */
  notifications: SnotifyNotifications = {
    leftTop: [], leftCenter: [], leftBottom: [],
    rightTop: [], rightCenter: [], rightBottom: [],
    centerTop: [], centerCenter: [], centerBottom: []
  };
  /**
   * Toasts emitter
   */
  emitter: Subscription;
  /**
   * Helper for slice pipe (maxOnScreen)
   */
  dockSizeA: number;
  /**
   * Helper for slice pipe (maxOnScreen)
   */
  dockSizeB: number | undefined;
  /**
   * Helper for slice pipe (maxAtPosition)
   */
  blockSizeA: number;
  /**
   * Helper for slice pipe (maxAtPosition)
   */
  blockSizeB: number | undefined;
  /**
   * Backdrop Opacity
   */
  backdrop = -1;
  /**
   * How many toasts with backdrop in current queue
   */
  withBackdrop: SnotifyToast[];
  closeOnBackground: boolean;
  isBackdropClick: boolean = false;
  /**
   * Set of toast IDs that are currently hiding (in beforeHide state)
   */
  hidingToasts = new Set<number>();
  constructor(private service: SnotifyService, private cd: ChangeDetectorRef) { }

  /**
   * Init base options. Subscribe to options, lifecycle change
   */
  ngOnInit() {
    this.emitter = this.service.emitter.subscribe((toasts: SnotifyToast[]) => {
      if (this.service.config.global.newOnTop) {
        this.dockSizeA = -this.service.config.global.maxOnScreen;
        this.dockSizeB = undefined;
        this.blockSizeA = -this.service.config.global.maxAtPosition;
        this.blockSizeB = undefined;
        this.withBackdrop = toasts.filter(toast => toast.config.backdrop >= 0);
      } else {
        this.dockSizeA = 0;
        this.dockSizeB = this.service.config.global.maxOnScreen;
        this.blockSizeA = 0;
        this.blockSizeB = this.service.config.global.maxAtPosition;
        this.withBackdrop = toasts.filter(toast => toast.config.backdrop >= 0).reverse();
      }
      this.closeOnBackground = this.service.config.global.closeOnBackgroundClick
      this.notifications = this.splitToasts(toasts.slice(this.dockSizeA, this.dockSizeB));
    });
  }

  /**
   * Changes the backdrop opacity
   * @param event SnotifyEventType
   */
  stateChanged(event: { type: SnotifyEventType, toast: SnotifyToast }) {
    if (event.type === 'beforeHide') this.hidingToasts.add(event.toast.id);

    const activeBackdrops = this.withBackdrop
      .filter(t => !this.hidingToasts.has(t.id))
      .map(t => t.config.backdrop);
    const maxActive = activeBackdrops.length ? Math.max(...activeBackdrops) : -1;

    switch (event.type) {
      case 'beforeShow':
        if (this.backdrop < 0 && event.toast.config.backdrop >= 0) this.backdrop = 0;
        break;
      case 'shown':
        if (event.toast.config.backdrop >= 0) this.backdrop = maxActive;
        break;
      case 'beforeHide':
        this.backdrop = Math.max(maxActive, 0);
        break;
      case 'hidden':
        if (maxActive < 0 || this.isBackdropClick) {
          this.backdrop = -1;
          this.isBackdropClick = false;
        }
        this.hidingToasts.delete(event.toast.id);
        break;
    }
    this.cd.detectChanges();
  }

  /**
   * Split toasts toasts into different objects
   * @param toasts SnotifyToast[]
   * @returns SnotifyNotifications
   */
  splitToasts(toasts: SnotifyToast[]): SnotifyNotifications {
    const result: SnotifyNotifications = {
      leftTop: [], leftCenter: [], leftBottom: [],
      rightTop: [], rightCenter: [], rightBottom: [],
      centerTop: [], centerCenter: [], centerBottom: []
    };

    toasts.forEach((toast: SnotifyToast) => {
      const position = toast.config.position as string;
      if (result[position]) {
        result[position].push(toast);
      }
    });

    return result;
  }

  /**
   * Unsubscribe subscriptions
   */
  ngOnDestroy() {
    this.emitter.unsubscribe();
  }
  remove() {
    if (this.closeOnBackground && this.getNotificationLength() > 0) {
      this.isBackdropClick = true;
      Object.keys(this.notifications).forEach(position => {
        this.notifications[position].forEach(toast => this.service.remove(toast.id));
      });
    }
  }
  getNotificationLength = (): number => {
    if (!this.notifications) {
      return 0;
    }
    return Object.values(this.notifications).reduce((acc, curr) => acc + curr.length, 0);
  }
}
