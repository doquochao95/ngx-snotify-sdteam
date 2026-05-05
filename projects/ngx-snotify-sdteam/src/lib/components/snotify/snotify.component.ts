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
  isBackdropClick: boolean = false;
  /**
   * Set of toast IDs that are currently hiding (in beforeHide state)
   */
  hidingToasts = new Set<number>();
  /**
   * Track which visible toast IDs had backdrop in the previous emission cycle.
   * Used to detect toasts that vanished without going through hide animation
   */
  private previousBackdropIds = new Set<number>();
  constructor(private service: SnotifyService, private cd: ChangeDetectorRef) { }

  /**
   * Init base options. Subscribe to options, lifecycle change
   */
  ngOnInit() {
    this.emitter = this.service.emitter.subscribe((toasts: SnotifyToast[]) => {
      const globalConfig = this.service.config.global;
      if (globalConfig.newOnTop) {
        this.dockSizeA = -globalConfig.maxOnScreen;
        this.dockSizeB = undefined;
        this.blockSizeA = -globalConfig.maxAtPosition;
        this.blockSizeB = undefined;
      } else {
        this.dockSizeA = 0;
        this.dockSizeB = globalConfig.maxOnScreen;
        this.blockSizeA = 0;
        this.blockSizeB = globalConfig.maxAtPosition;
      }
      const visibleToasts = toasts.slice(this.dockSizeA, this.dockSizeB);
      // Split first, then compute actually rendered toasts (after both maxOnScreen AND maxAtPosition)
      const splitNotifications = this.splitToasts(visibleToasts);
      const renderedToasts: SnotifyToast[] = [];
      Object.values(splitNotifications).forEach((posToasts: SnotifyToast[]) => {
        renderedToasts.push(...posToasts.slice(this.blockSizeA, this.blockSizeB));
      });
      // Only actually rendered toasts can contribute to backdrop opacity.
      this.withBackdrop = renderedToasts.filter(toast => toast.config.backdrop >= 0);
      if (!globalConfig.newOnTop) {
        this.withBackdrop.reverse();
      }
      const currentBackdropIds = new Set(this.withBackdrop.map(t => t.id));
      // Detect backdrop toasts that disappeared without going through stateChanged lifecycle.
      let hasOrphanedBackdropToast = false;
      this.previousBackdropIds.forEach(prevId => {
        if (!currentBackdropIds.has(prevId)) {
          hasOrphanedBackdropToast = true;
          this.hidingToasts.delete(prevId);
        }
      });
      // Clean up hidingToasts for any toast no longer in the full queue
      const allIds = new Set(toasts.map(t => t.id));
      this.hidingToasts.forEach(id => {
        if (!allIds.has(id)) {
          this.hidingToasts.delete(id);
        }
      });
      // Recalculate what backdrop should be based on remaining rendered toasts
      const activeBackdrops = this.withBackdrop
        .filter(t => !this.hidingToasts.has(t.id))
        .map(t => t.config.backdrop);
      const maxActive = activeBackdrops.length ? Math.max(...activeBackdrops) : -1;
      // If the queue is now empty, force backdrop reset
      if (toasts.length === 0) {
        this.backdrop = -1;
        this.isBackdropClick = false;
        this.hidingToasts.clear();
      }
      // If any backdrop toast was evicted without 'hidden' event,
      // recalculate backdrop from the remaining rendered toasts
      else if (hasOrphanedBackdropToast) {
        this.backdrop = maxActive;
        if (this.backdrop < 0) {
          this.isBackdropClick = false;
        }
      }
      // Save current backdrop IDs for next cycle comparison
      this.previousBackdropIds = currentBackdropIds;
      this.notifications = splitNotifications;
      this.cd.detectChanges();
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
        if (this.backdrop >= 0) {
          this.backdrop = Math.max(maxActive, 0);
        }
        break;
      case 'hidden':
        this.hidingToasts.delete(event.toast.id);
        if (this.isBackdropClick) {
          // Keep backdrop hidden until ALL toasts finish their hide animation
          this.backdrop = -1;
          if (this.hidingToasts.size === 0) {
            this.isBackdropClick = false;
          }
        } else if (maxActive < 0) {
          this.backdrop = -1;
        } else {
          this.backdrop = maxActive;
        }
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
    if (!this.withBackdrop || this.withBackdrop.length === 0) return;
    const closableToasts = this.withBackdrop.filter(toast => toast.config.closeOnBackgroundClick);
    if (closableToasts.length > 0) {
      this.isBackdropClick = true;
      closableToasts.forEach(toast => this.service.remove(toast.id));
    }
  }
}
