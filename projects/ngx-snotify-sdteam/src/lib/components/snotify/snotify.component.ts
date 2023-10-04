import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
  notifications: SnotifyNotifications;
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
  constructor(private service: SnotifyService) { }

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
      this.stateChanged('mounted');
    });
  }

  // TODO: fix backdrop if more than one toast called in a row
  /**
   * Changes the backdrop opacity
   * @param event SnotifyEventType
   */
  stateChanged(event: SnotifyEventType) {
    if (this.closeOnBackground) {
      let notlen = this.getNotificationLength()
      if (!this.withBackdrop.length) {
        if (event == 'mounted') {
          if (this.backdrop != -1 && notlen == 0)
            this.backdrop = -1
        }
        else {
          if (this.backdrop != 0)
            this.backdrop = 0
        }
      }
      else {
        if (event == 'mounted') {
          if (this.backdrop < 0)
            this.backdrop = 0
        }
        else
          this.backdrop = this.withBackdrop[this.withBackdrop.length - 1].config.backdrop
      }
    }
    else {
      if (!this.withBackdrop.length)
        this.backdrop = -1;
      else
        this.backdrop = this.withBackdrop[this.withBackdrop.length - 1].config.backdrop;
    }
  }

  /**
   * Split toasts toasts into different objects
   * @param toasts SnotifyToast[]
   * @returns SnotifyNotifications
   */
  splitToasts(toasts: SnotifyToast[]): SnotifyNotifications {
    const result: SnotifyNotifications = {};

    for (const property in SnotifyPosition) {
      if (SnotifyPosition.hasOwnProperty(property)) {
        result[SnotifyPosition[property]] = [];
      }
    }

    toasts.forEach((toast: SnotifyToast) => {
      result[toast.config.position as string].push(toast);
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
    let notlen = this.getNotificationLength()
    if (this.closeOnBackground && notlen > 0) {
      if (this.notifications.centerTop.length > 0)
        this.notifications.centerTop.map(x => this.service.remove(x.id))
      if (this.notifications.centerCenter.length > 0)
        this.notifications.centerCenter.map(x => this.service.remove(x.id))
      if (this.notifications.centerBottom.length > 0)
        this.notifications.centerBottom.map(x => this.service.remove(x.id))
      if (this.notifications.leftTop.length > 0)
        this.notifications.leftTop.map(x => this.service.remove(x.id))
      if (this.notifications.leftCenter.length > 0)
        this.notifications.leftCenter.map(x => this.service.remove(x.id))
      if (this.notifications.leftBottom.length > 0)
        this.notifications.leftBottom.map(x => this.service.remove(x.id))
      if (this.notifications.rightTop.length > 0)
        this.notifications.rightTop.map(x => this.service.remove(x.id))
      if (this.notifications.rightCenter.length > 0)
        this.notifications.rightCenter.map(x => this.service.remove(x.id))
      if (this.notifications.rightBottom.length > 0)
        this.notifications.rightBottom.map(x => this.service.remove(x.id))
    }
  }
  getNotificationLength = (): number => {
    let result = this.notifications.centerBottom.length + this.notifications.centerCenter.length + this.notifications.centerTop.length +
      this.notifications.leftBottom.length + this.notifications.leftCenter.length + this.notifications.leftTop.length +
      this.notifications.rightBottom.length + this.notifications.rightCenter.length + this.notifications.rightTop.length
    return result
  }
}
